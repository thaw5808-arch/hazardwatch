import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';
import { Agent } from 'https';

const ipv4HttpsAgent = new Agent({ family: 4 });

interface UsgsVolcanoMeta {
  vnum: string;
  vName: string;
  subregion: string | null;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  obsAbbr: string | null;
  webpage: string | null;
}

interface UsgsMonitoredStatus {
  volcano_name: string;
  vnum: string | null;
  alert_level: string;
  color_code: string;
  obs_fullname: string;
}

@Injectable()
export class VolcanoService {
  private readonly logger = new Logger(VolcanoService.name);
  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getAll(params: { lat?: number; lon?: number; radiusKm?: number; limit?: number } = {}) {
    const { lat, lon, radiusKm = 5000, limit = 200 } = params;
    const cacheKey = `volcano:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    let rows: Record<string, unknown>[];
    if (lat !== undefined && lon !== undefined) {
      const res = await this.db.query(`
        SELECT id, gvp_id, name, country, alert_level, elevation_m, is_monitored, updated_at,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon,
          ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
        FROM volcanoes
        WHERE ST_DWithin(location::geography, ST_MakePoint($1,$2)::geography, $3*1000)
        ORDER BY CASE alert_level WHEN 'warning' THEN 4 WHEN 'watch' THEN 3 WHEN 'advisory' THEN 2 ELSE 1 END DESC
        LIMIT $4
      `, [lon, lat, radiusKm, limit]);
      rows = res.rows;
    } else {
      const res = await this.db.query(`
        SELECT id, gvp_id, name, country, alert_level, elevation_m, is_monitored, updated_at,
          ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
        FROM volcanoes
        ORDER BY CASE alert_level WHEN 'warning' THEN 4 WHEN 'watch' THEN 3 WHEN 'advisory' THEN 2 ELSE 1 END DESC
        LIMIT $1
      `, [limit]);
      rows = res.rows;
    }

    const result = { total: rows.length, data: rows };
    await this.redis.setex(cacheKey, 600, JSON.stringify(result));
    return result;
  }

  async ingestVolcanoes(): Promise<number> {
    let metaList: UsgsVolcanoMeta[] = [];
    let statusList: UsgsMonitoredStatus[] = [];

    const controller1 = new AbortController();
    const t1 = setTimeout(() => controller1.abort(), 20000);
    try {
      const res = await axios.get<UsgsVolcanoMeta[]>(
        'https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesUS',
        { timeout: 20000, httpsAgent: ipv4HttpsAgent, signal: controller1.signal },
      );
      metaList = res.data;
    } catch (err) {
      this.logger.warn(`USGS volcano metadata fetch failed: ${(err as Error).message}`);
      return 0;
    } finally {
      clearTimeout(t1);
    }

    const controller2 = new AbortController();
    const t2 = setTimeout(() => controller2.abort(), 20000);
    try {
      const res = await axios.get<UsgsMonitoredStatus[]>(
        'https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes',
        { timeout: 20000, httpsAgent: ipv4HttpsAgent, signal: controller2.signal },
      );
      statusList = res.data;
    } catch (err) {
      this.logger.warn(`USGS volcano status fetch failed: ${(err as Error).message}`);
    } finally {
      clearTimeout(t2);
    }

    const statusByVnum = new Map<string, UsgsMonitoredStatus>();
    for (const s of statusList) {
      if (s.vnum) statusByVnum.set(s.vnum, s);
    }

    let upserted = 0;
    for (const v of metaList) {
      if (!v.vnum || !v.latitude || !v.longitude) continue;
      const status = statusByVnum.get(v.vnum);
      const alertLevel = (status?.alert_level ?? 'NORMAL').toLowerCase();

      const roundedElevation = v.elevation_m !== null && v.elevation_m !== undefined
        ? Math.round(v.elevation_m)
        : null;

      await this.db.query(`
        INSERT INTO volcanoes (gvp_id, name, country, location, elevation_m, alert_level, is_monitored, raw_data, updated_at)
        VALUES ($1,$2,$3,ST_MakePoint($4,$5)::geography,$6,$7,TRUE,$8,NOW())
        ON CONFLICT (gvp_id) DO UPDATE SET
          name = $2, country = $3, location = ST_MakePoint($4,$5)::geography,
          elevation_m = $6, alert_level = $7, raw_data = $8, updated_at = NOW()
      `, [
        v.vnum, v.vName, v.subregion ?? v.obsAbbr ?? 'Unknown',
        v.longitude, v.latitude, roundedElevation, alertLevel,
        JSON.stringify({ meta: v, status: status ?? null }),
      ]);
      upserted++;
    }

    if (upserted > 0) this.logger.log(`USGS volcano ingest: ${upserted} volcanoes refreshed`);
    return upserted;
  }
}
