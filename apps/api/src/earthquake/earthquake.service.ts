import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';

const USGS_HOURLY  = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
const USGS_DAY     = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson';

export interface EarthquakeQueryParams {
  lat?: number; lon?: number;
  radiusKm?: number; minMagnitude?: number;
  hours?: number; limit?: number;
}

@Injectable()
export class EarthquakeService {
  private readonly logger = new Logger(EarthquakeService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getRecent(params: EarthquakeQueryParams) {
    const { lat, lon, radiusKm, minMagnitude = 2.5, hours = 24, limit = 100 } = params;
    const cacheKey = `eq:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    let rows: Record<string, unknown>[];

    if (lat !== undefined && lon !== undefined && radiusKm !== undefined) {
      const res = await this.db.query<Record<string, unknown>>(`
        SELECT id, usgs_id, magnitude, magnitude_type, depth_km, place_name,
          occurred_at, updated_at, status, tsunami_risk, alert_level,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
          ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM earthquakes
        WHERE occurred_at > NOW() - ($3 || ' hours')::INTERVAL
          AND magnitude >= $4
          AND status != 'deleted'
          AND ST_DWithin(location::geography, ST_MakePoint($1,$2)::geography, $5*1000)
        ORDER BY occurred_at DESC LIMIT $6
      `, [lon, lat, hours, minMagnitude, radiusKm, limit]);
      rows = res.rows;
    } else if (lat !== undefined && lon !== undefined) {
      const res = await this.db.query<Record<string, unknown>>(`
        SELECT id, usgs_id, magnitude, magnitude_type, depth_km, place_name,
          occurred_at, updated_at, status, tsunami_risk, alert_level,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
          ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM earthquakes
        WHERE occurred_at > NOW() - ($3 || ' hours')::INTERVAL
          AND magnitude >= $4
          AND status != 'deleted'
        ORDER BY occurred_at DESC LIMIT $5
      `, [lon, lat, hours, minMagnitude, limit]);
      rows = res.rows;
    } else {
      const res = await this.db.query<Record<string, unknown>>(`
        SELECT id, usgs_id, magnitude, magnitude_type, depth_km, place_name,
          occurred_at, updated_at, status, tsunami_risk, alert_level,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
        FROM earthquakes
        WHERE occurred_at > NOW() - ($1 || ' hours')::INTERVAL
          AND magnitude >= $2
          AND status != 'deleted'
        ORDER BY occurred_at DESC LIMIT $3
      `, [hours, minMagnitude, limit]);
      rows = res.rows;
    }

    const result = { total: rows.length, earthquakes: rows };
    await this.redis.setex(cacheKey, 30, JSON.stringify(result));
    return result;
  }

  async getById(id: string) {
    const { rows } = await this.db.query('SELECT * FROM earthquakes WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async ingestUSGSFeed(): Promise<number> {
    const [hourly, significant] = await Promise.allSettled([
      axios.get(USGS_HOURLY,  { timeout: 10000 }),
      axios.get(USGS_DAY,     { timeout: 10000 }),
    ]);

    const features: unknown[] = [];
    if (hourly.status === 'fulfilled')     features.push(...(hourly.value.data as { features: unknown[] }).features);
    if (significant.status === 'fulfilled') features.push(...(significant.value.data as { features: unknown[] }).features);

    // Deduplicate by usgs_id
    const seen = new Set<string>();
    const unique = features.filter((f) => {
      const id = (f as { id: string }).id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let inserted = 0;
    for (const feature of unique) {
      const f = feature as { id: string; properties: Record<string, unknown>; geometry: { coordinates: number[] } };
      const { id, properties: p, geometry } = f;
      const [lon, lat, depth] = geometry.coordinates;

      const { rows: existing } = await this.db.query(
        'SELECT id FROM earthquakes WHERE usgs_id = $1', [id]
      );
      if (existing.length > 0) continue;

      const { rows: [newEq] } = await this.db.query(`
        INSERT INTO earthquakes (
          usgs_id, magnitude, magnitude_type, depth_km, location,
          place_name, occurred_at, updated_at, status, tsunami_risk, alert_level, raw_data
        ) VALUES ($1,$2,$3,$4,ST_MakePoint($5,$6)::geography,
          $7,to_timestamp($8::bigint/1000.0),to_timestamp($9::bigint/1000.0),$10,$11,$12,$13)
        ON CONFLICT (usgs_id) DO NOTHING
        RETURNING *
      `, [
        id, p['mag'], p['magType'] ?? 'mw', depth ?? 0,
        lon, lat, p['place'] ?? 'Unknown',
        p['time'], p['updated'],
        p['status'] ?? 'automatic',
        (p['tsunami'] as number) === 1,
        p['alert'] ?? null,
        JSON.stringify(p),
      ]);

      if (newEq) {
        inserted++;
        await this.redis.publish('earthquake:new', JSON.stringify(newEq));
      }
    }

    if (inserted > 0) this.logger.log(`USGS ingest: ${inserted} new earthquakes`);
    return inserted;
  }
}
