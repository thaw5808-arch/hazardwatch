import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';
import { Agent } from 'https';
import { country_reverse_geocoding } from 'country-reverse-geocoding';

const ipv4HttpsAgent = new Agent({ family: 4 });
const crg = country_reverse_geocoding();

@Injectable()
export class WildfireService {
  private readonly logger = new Logger(WildfireService.name);

  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getActive(params: { lat?: number; lon?: number; radiusKm?: number; minConfidence?: number; limit?: number }) {
    const { lat, lon, radiusKm, minConfidence = 50, limit = 200 } = params;
    const cacheKey = `wildfire:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    let rows: Record<string, unknown>[];
    if (lat !== undefined && lon !== undefined && radiusKm !== undefined) {
      const res = await this.db.query(`
        SELECT id, firms_id, name, country, brightness_k, confidence, frp, is_active,
          first_detected, last_detected,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
          ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM wildfires
        WHERE is_active = TRUE AND confidence >= $3
          AND ST_DWithin(location::geography, ST_MakePoint($1,$2)::geography, $4*1000)
        ORDER BY frp DESC NULLS LAST LIMIT $5
      `, [lon, lat, minConfidence, radiusKm, limit]);
      rows = res.rows;
    } else if (lat !== undefined && lon !== undefined) {
      const res = await this.db.query(`
        SELECT id, firms_id, name, country, brightness_k, confidence, frp, is_active,
          first_detected, last_detected,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
          ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM wildfires
        WHERE is_active = TRUE AND confidence >= $3
        ORDER BY frp DESC NULLS LAST LIMIT $4
      `, [lon, lat, minConfidence, limit]);
      rows = res.rows;
    } else {
      const res = await this.db.query(`
        SELECT id, firms_id, name, country, brightness_k, confidence, frp, is_active,
          first_detected, last_detected,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
        FROM wildfires
        WHERE is_active = TRUE AND confidence >= $1
        ORDER BY frp DESC NULLS LAST LIMIT $2
      `, [minConfidence, limit]);
      rows = res.rows;
    }

    const result = { total: rows.length, wildfires: rows };
    await this.redis.setex(cacheKey, 900, JSON.stringify(result));
    return result;
  }

  private readonly minConfidenceDefault = 30;

  async ingestFIRMS(): Promise<number> {
    const apiKey = process.env.NASA_FIRMS_API_KEY;
    if (!apiKey) { this.logger.warn('NASA_FIRMS_API_KEY not set'); return 0; }

    // FIRMS VIIRS 24h global CSV
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let csv: string;
    try {
      const res = await axios.get<string>(url, { timeout: 30000, httpsAgent: ipv4HttpsAgent, signal: controller.signal });
      csv = res.data;
    } finally {
      clearTimeout(timeoutId);
    }
    const lines = csv.split('\n').slice(1).filter(Boolean);
    let inserted = 0;
    let kept = 0;
    let skippedExisting = 0;

    const confidenceMap: Record<string, number> = { l: 30, n: 60, h: 90 };

    for (const line of lines.slice(0, 500)) { // cap at 500 per run
      const cols = line.split(',');
      const [lat, lon, brightness, , , acq_date, , , , confidenceRaw, , , frp] = cols;
      if (!lat || !lon) continue;

      let confidence: number;
      if (confidenceRaw in confidenceMap) {
        confidence = confidenceMap[confidenceRaw];
      } else {
        const parsed = parseInt(confidenceRaw ?? '0', 10);
        confidence = isNaN(parsed) ? 0 : parsed;
      }

      if (confidence < this.minConfidenceDefault) continue;
      kept++;

      const firmsId = `VIIRS_${lat}_${lon}_${acq_date}`;
      try {
        const { rows: existing } = await this.db.query('SELECT id FROM wildfires WHERE firms_id = $1', [firmsId]);
        if (existing.length > 0) { skippedExisting++; continue; }

        let countryName = 'unknown';
        try {
          const geo = crg.get_country(parseFloat(lat), parseFloat(lon));
          if (geo && geo.name) countryName = geo.name;
        } catch {
          // keep 'unknown' on lookup failure
        }

        await this.db.query(`
          INSERT INTO wildfires (firms_id, country, location, brightness_k, confidence, frp, first_detected, last_detected)
          VALUES ($1,$7,ST_MakePoint($2,$3)::geography,$4,$5,$6,NOW(),NOW())
          ON CONFLICT (firms_id) DO UPDATE SET last_detected = NOW()
        `, [firmsId, parseFloat(lon), parseFloat(lat), parseFloat(brightness), confidence, parseFloat(frp ?? '0'), countryName]);
        inserted++;
      } catch (rowErr) {
        this.logger.error(`Row insert failed for ${firmsId}: ${(rowErr as Error).message}`);
      }
    }

    console.log('RAW DEBUG: kept=', kept, 'skippedExisting=', skippedExisting, 'inserted=', inserted);
    if (inserted > 0) this.logger.log(`FIRMS ingest: ${inserted} new hotspots`);
    return inserted;
  }

  async backfillCountries(): Promise<number> {
    const { rows } = await this.db.query<{ id: string; lat: number; lon: number }>(`
      SELECT id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
      FROM wildfires WHERE country = 'unknown'
    `);

    let updated = 0;
    for (const row of rows) {
      try {
        const geo = crg.get_country(row.lat, row.lon);
        if (geo && geo.name) {
          await this.db.query('UPDATE wildfires SET country = $1 WHERE id = $2', [geo.name, row.id]);
          updated++;
        }
      } catch {
        // leave as 'unknown' on lookup failure
      }
    }
    this.logger.log(`Backfilled country for ${updated} of ${rows.length} wildfires`);
    return updated;
  }
}
