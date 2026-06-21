import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getActive(params: { lat?: number; lon?: number; radiusKm?: number; hazardTypes?: string[]; severity?: string; limit?: number }) {
    const { lat, lon, radiusKm = 500, limit = 50 } = params;
    const cacheKey = `alerts:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    let rows: Record<string, unknown>[];
    if (lat !== undefined && lon !== undefined) {
      const res = await this.db.query(`
        SELECT * FROM alerts
        WHERE is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (affected_area IS NULL OR ST_DWithin(affected_area::geography, ST_MakePoint($1,$2)::geography, $3*1000))
        ORDER BY issued_at DESC LIMIT $4
      `, [lon, lat, radiusKm, limit]);
      rows = res.rows;
    } else {
      const res = await this.db.query(`
        SELECT * FROM alerts WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY issued_at DESC LIMIT $1
      `, [limit]);
      rows = res.rows;
    }

    const result = { total: rows.length, alerts: rows };
    await this.redis.setex(cacheKey, 30, JSON.stringify(result));
    return result;
  }

  async createAlert(data: { hazard_type: string; severity: string; title: string; summary: string; source: string; hazard_id?: string; expires_at?: string }) {
    const { rows: [alert] } = await this.db.query(`
      INSERT INTO alerts (hazard_type, severity, title, summary, source, hazard_id, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [data.hazard_type, data.severity, data.title, data.summary, data.source, data.hazard_id ?? null, data.expires_at ?? null]);
    await this.redis.publish('alert:new', JSON.stringify(alert));
    return alert;
  }
}
