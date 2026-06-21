import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';

@Injectable()
export class AirQualityService {
  private readonly logger = new Logger(AirQualityService.name);

  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getCurrent(lat: number, lon: number, radiusKm = 50) {
    const cacheKey = `aq:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const { rows } = await this.db.query(`
      SELECT station_id, station_name, aqi, pm25, pm10, o3, no2, so2, co, recorded_at,
        ROUND(ST_Distance(location::geography, ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
      FROM air_quality_readings
      WHERE recorded_at > NOW() - INTERVAL '2 hours'
        AND ST_DWithin(location::geography, ST_MakePoint($1,$2)::geography, $3*1000)
      ORDER BY recorded_at DESC LIMIT 1
    `, [lon, lat, radiusKm]);

    const result = rows[0] ? { reading: rows[0] } : { reading: null, note: 'No nearby station data' };
    await this.redis.setex(cacheKey, 600, JSON.stringify(result));
    return result;
  }

  async ingestOpenAQ(): Promise<number> {
    const apiKey = process.env.OPENAQ_API_KEY;
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};

    const { data } = await axios.get('https://api.openaq.org/v3/locations', {
      params: { limit: 100, order_by: 'id', sort_order: 'desc' },
      headers, timeout: 15000,
    });

    let inserted = 0;
    for (const loc of (data.results as Array<Record<string, unknown>>)) {
      const coords = loc['coordinates'] as { latitude: number; longitude: number };
      if (!coords) continue;

      const params = loc['parameters'] as Array<{ parameter: string; lastValue: number }> ?? [];
      const getParam = (name: string) => params.find((p) => p.parameter === name)?.lastValue ?? null;

      await this.db.query(`
        INSERT INTO air_quality_readings (station_id, station_name, location, recorded_at, aqi, pm25, pm10, o3, no2, source)
        VALUES ($1,$2,ST_MakePoint($3,$4)::geography,NOW(),null,$5,$6,$7,$8,'openaq')
        ON CONFLICT DO NOTHING
      `, [String(loc['id']), loc['name'], coords.longitude, coords.latitude,
          getParam('pm25'), getParam('pm10'), getParam('o3'), getParam('no2')]);
      inserted++;
    }

    this.logger.log(`OpenAQ ingest: ${inserted} stations refreshed`);
    return inserted;
  }
}
