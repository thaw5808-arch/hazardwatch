import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';
import { Agent } from 'https';

const ipv4HttpsAgent = new Agent({ family: 4 });

interface NhcStorm {
  id: string;
  binNumber?: string;
  name: string;
  classification: string;
  intensity?: string;
  pressure?: string;
  latitude: string;
  longitude: string;
  latitudeNumeric?: number;
  longitudeNumeric?: number;
  lastUpdate?: string;
}

@Injectable()
export class CycloneService {
  private readonly logger = new Logger(CycloneService.name);
  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getAll(params: { lat?: number; lon?: number; radiusKm?: number; limit?: number } = {}) {
    const { lat, lon, radiusKm = 2000, limit = 100 } = params;
    const cacheKey = `cyclone:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    let rows: Record<string, unknown>[];
    if (lat !== undefined && lon !== undefined) {
      const res = await this.db.query(`
        SELECT id, storm_id, name, basin, category, storm_type, is_active,
          ST_Y(current_center::geometry) AS lat, ST_X(current_center::geometry) AS lon,
          wind_speed_kts, pressure_mb, first_seen_at, last_updated_at,
          ROUND(ST_Distance(current_center::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM cyclones
        WHERE is_active = TRUE
          AND ST_DWithin(current_center::geography, ST_MakePoint($1,$2)::geography, $3*1000)
        ORDER BY wind_speed_kts DESC NULLS LAST LIMIT $4
      `, [lon, lat, radiusKm, limit]);
      rows = res.rows;
    } else {
      const res = await this.db.query(`
        SELECT id, storm_id, name, basin, category, storm_type, is_active,
          ST_Y(current_center::geometry) AS lat, ST_X(current_center::geometry) AS lon,
          wind_speed_kts, pressure_mb, first_seen_at, last_updated_at
        FROM cyclones
        WHERE is_active = TRUE
        ORDER BY wind_speed_kts DESC NULLS LAST LIMIT $1
      `, [limit]);
      rows = res.rows;
    }

    const result = { total: rows.length, data: rows };
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  async getTrack(stormId: string) {
    const res = await this.db.query(`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
        recorded_at, wind_speed_kts, pressure_mb, storm_type, is_forecast, forecast_hour
      FROM cyclone_track_points tp
      JOIN cyclones c ON c.id = tp.cyclone_id
      WHERE c.storm_id = $1
      ORDER BY recorded_at ASC
    `, [stormId]);
    return { storm_id: stormId, points: res.rows };
  }

  private classify(classification: string): { type: string; category: number | null } {
    const c = (classification || '').toUpperCase();
    if (c === 'HU') {
      return { type: 'hurricane', category: null }; // category computed from wind speed below
    }
    if (c === 'TS') return { type: 'tropical_storm', category: null };
    if (c === 'TD') return { type: 'tropical_depression', category: null };
    if (c === 'STS') return { type: 'subtropical_storm', category: null };
    if (c === 'STD') return { type: 'subtropical_depression', category: null };
    if (c === 'PTC') return { type: 'post_tropical', category: null };
    return { type: c.toLowerCase() || 'unknown', category: null };
  }

  private saffirSimpson(windKts: number | null): number | null {
    if (windKts === null || isNaN(windKts)) return null;
    if (windKts >= 137) return 5;
    if (windKts >= 113) return 4;
    if (windKts >= 96) return 3;
    if (windKts >= 83) return 2;
    if (windKts >= 64) return 1;
    return null; // below hurricane strength
  }

  private inferBasin(lon: number, lat: number): string {
    if (lon >= -100 && lon <= 0 && lat >= 0) return 'Atlantic';
    if (lon >= -180 && lon < -100 && lat >= 0) return 'Eastern Pacific';
    if (lon >= 100 && lon <= 180 && lat >= 0) return 'Western Pacific';
    if (lat < 0 && lon >= 30 && lon < 135) return 'South Indian';
    if (lat < 0 && lon >= 135) return 'South Pacific';
    if (lon >= 30 && lon < 100 && lat >= 0) return 'North Indian';
    return 'Unknown';
  }

  async ingestNHC(): Promise<number> {
    let storms: NhcStorm[] = [];
    try {
      const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let data: { activeStorms: NhcStorm[] };
        try {
          const res = await axios.get<{ activeStorms: NhcStorm[] }>(
            'https://www.nhc.noaa.gov/CurrentStorms.json',
            { timeout: 15000, httpsAgent: ipv4HttpsAgent, signal: controller.signal },
          );
          data = res.data;
        } finally {
          clearTimeout(timeoutId);
        }
      storms = data.activeStorms ?? [];
    } catch (err) {
      this.logger.warn(`NHC fetch failed: ${(err as Error).message}`);
      return 0;
    }

    let upserted = 0;
    const seenIds: string[] = [];

    for (const storm of storms) {
      const lat = storm.latitudeNumeric ?? parseFloat(storm.latitude);
      const lon = storm.longitudeNumeric ?? parseFloat(storm.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      const stormId = storm.id || storm.binNumber || `${storm.name}_${lat}_${lon}`;
      seenIds.push(stormId);

      const windKts = storm.intensity ? parseInt(storm.intensity) : null;
      const pressureMb = storm.pressure ? parseInt(storm.pressure) : null;
      const { type } = this.classify(storm.classification);
      const category = type === 'hurricane' ? this.saffirSimpson(windKts) : null;
      const basin = this.inferBasin(lon, lat);
      const lastUpdate = storm.lastUpdate ? new Date(storm.lastUpdate) : new Date();

      const { rows: existing } = await this.db.query('SELECT id FROM cyclones WHERE storm_id = $1', [stormId]);

      if (existing.length > 0) {
        await this.db.query(`
          UPDATE cyclones SET
            name = $2, basin = $3, category = $4, storm_type = $5, is_active = TRUE,
            current_center = ST_MakePoint($6,$7)::geography,
            wind_speed_kts = $8, pressure_mb = $9, last_updated_at = $10, raw_data = $11
          WHERE storm_id = $1
        `, [stormId, storm.name, basin, category, type, lon, lat, windKts, pressureMb, lastUpdate, JSON.stringify(storm)]);

        await this.db.query(`
          INSERT INTO cyclone_track_points (cyclone_id, location, recorded_at, wind_speed_kts, pressure_mb, storm_type, is_forecast)
          SELECT id, ST_MakePoint($2,$3)::geography, $4, $5, $6, $7, FALSE FROM cyclones WHERE storm_id = $1
          ON CONFLICT DO NOTHING
        `, [stormId, lon, lat, lastUpdate, windKts, pressureMb, type]);
      } else {
        await this.db.query(`
          INSERT INTO cyclones (storm_id, name, basin, category, storm_type, is_active, current_center,
            wind_speed_kts, pressure_mb, first_seen_at, last_updated_at, raw_data)
          VALUES ($1,$2,$3,$4,$5,TRUE,ST_MakePoint($6,$7)::geography,$8,$9,$10,$10,$11)
        `, [stormId, storm.name, basin, category, type, lon, lat, windKts, pressureMb, lastUpdate, JSON.stringify(storm)]);

        const { rows: created } = await this.db.query('SELECT id FROM cyclones WHERE storm_id = $1', [stormId]);
        if (created[0]) {
          await this.db.query(`
            INSERT INTO cyclone_track_points (cyclone_id, location, recorded_at, wind_speed_kts, pressure_mb, storm_type, is_forecast)
            VALUES ($1, ST_MakePoint($2,$3)::geography, $4, $5, $6, $7, FALSE)
          `, [created[0].id, lon, lat, lastUpdate, windKts, pressureMb, type]);
        }
      }
      upserted++;
    }

    // Mark storms no longer in NHC feed as inactive
    if (seenIds.length > 0) {
      await this.db.query(
        `UPDATE cyclones SET is_active = FALSE WHERE is_active = TRUE AND storm_id NOT LIKE 'JTWC_%' AND storm_id NOT IN (${seenIds.map((_, i) => `$${i + 1}`).join(',')})`,
        seenIds,
      );
    } else {
      await this.db.query(`UPDATE cyclones SET is_active = FALSE WHERE is_active = TRUE AND storm_id NOT LIKE 'JTWC_%'`);
    }

    if (upserted > 0) this.logger.log(`NHC ingest: ${upserted} active storms`);
    return upserted;
  }

  private classifyJTWC(typeStr: string): string {
    const t = typeStr.toUpperCase();
    if (t.includes('SUPER TYPHOON')) return 'super_typhoon';
    if (t.includes('TYPHOON')) return 'typhoon';
    if (t.includes('TROPICAL STORM')) return 'tropical_storm';
    if (t.includes('TROPICAL DEPRESSION')) return 'tropical_depression';
    if (t.includes('SUBTROPICAL STORM')) return 'subtropical_storm';
    if (t.includes('SUBTROPICAL DEPRESSION')) return 'subtropical_depression';
    return 'unknown';
  }

  async ingestJTWC(): Promise<number> {
    let xmlData: string;
    try {
      const res = await axios.get<string>('https://www.gdacs.org/xml/rss_tc.xml', {
        timeout: 15000, httpsAgent: ipv4HttpsAgent, responseType: 'text',
      });
      xmlData = res.data;
    } catch (err) {
      this.logger.warn(`GDACS fetch failed: ${(err as Error).message}`);
      return 0;
    }

    const items = xmlData.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    let upserted = 0;
    const seenIds: string[] = [];

    for (const item of items) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const pointMatch = item.match(/<georss:point>([\d.-]+)\s+([\d.-]+)<\/georss:point>/);
      const severityMatch = item.match(/<gdacs:severity[^>]*value="([\d.]+)"/);
      const eventIdMatch = item.match(/<gdacs:eventid[^>]*>([\d]+)<\/gdacs:eventid>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

      if (!titleMatch || !pointMatch || !eventIdMatch) continue;

      const title = titleMatch[1].trim();
      const lat = parseFloat(pointMatch[1]);
      const lon = parseFloat(pointMatch[2]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const stormId = `JTWC_GDACS_${eventIdMatch[1]}`;
      seenIds.push(stormId);

      const nameMatch = title.match(/([A-Z][A-Z0-9]*(?:-\d{2})?)\s*$/);
      const name = nameMatch ? nameMatch[1] : title;
      const typeStr = title.replace(name, '').trim();
      const type = this.classifyJTWC(typeStr || title);

      const windKmh = severityMatch ? parseFloat(severityMatch[1]) : null;
      const windKts = windKmh ? Math.round(windKmh / 1.852) : null;
      const category = ['typhoon','super_typhoon','hurricane'].includes(type) ? this.saffirSimpson(windKts) : null;
      const basin = this.inferBasin(lon, lat);
      const lastUpdate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

      const { rows: existing } = await this.db.query('SELECT id FROM cyclones WHERE storm_id = $1', [stormId]);
      if (existing.length > 0) {
        await this.db.query(`
          UPDATE cyclones SET name=$2, basin=$3, category=$4, storm_type=$5, is_active=TRUE,
            current_center=ST_MakePoint($6,$7)::geography,
            wind_speed_kts=$8, pressure_mb=NULL, last_updated_at=$9, raw_data=$10
          WHERE storm_id=$1
        `, [stormId, name, basin, category, type, lon, lat, windKts, lastUpdate, JSON.stringify({ title })]);
      } else {
        await this.db.query(`
          INSERT INTO cyclones (storm_id, name, basin, category, storm_type, is_active, current_center,
            wind_speed_kts, pressure_mb, first_seen_at, last_updated_at, raw_data)
          VALUES ($1,$2,$3,$4,$5,TRUE,ST_MakePoint($6,$7)::geography,$8,NULL,$9,$9,$10)
        `, [stormId, name, basin, category, type, lon, lat, windKts, lastUpdate, JSON.stringify({ title })]);

        const { rows: created } = await this.db.query('SELECT id FROM cyclones WHERE storm_id=$1', [stormId]);
        if (created[0]) {
          await this.db.query(`
            INSERT INTO cyclone_track_points (cyclone_id, location, recorded_at, wind_speed_kts, pressure_mb, storm_type, is_forecast)
            VALUES ($1, ST_MakePoint($2,$3)::geography, $4, $5, NULL, $6, FALSE)
          `, [created[0].id, lon, lat, lastUpdate, windKts, type]);
        }
      }
      upserted++;
    }

    if (seenIds.length > 0) {
      const placeholders = seenIds.map((_, i) => '$' + (i + 1)).join(',');
      await this.db.query(
        `UPDATE cyclones SET is_active=FALSE WHERE is_active=TRUE AND storm_id LIKE 'JTWC_GDACS_%' AND storm_id NOT IN (${placeholders})`,
        seenIds,
      );
    } else {
      await this.db.query(`UPDATE cyclones SET is_active=FALSE WHERE is_active=TRUE AND storm_id LIKE 'JTWC_GDACS_%'`);
    }

    if (upserted > 0) this.logger.log(`GDACS ingest: ${upserted} active storms`);
    return upserted;
  }
}
