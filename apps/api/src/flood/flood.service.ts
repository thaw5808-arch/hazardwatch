import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FloodService {
  private readonly logger = new Logger(FloodService.name);
  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getAll(params: { lat?: number; lon?: number; radiusKm?: number; limit?: number } = {}) {
    const { lat, lon, radiusKm = 1000, limit = 100 } = params;
    const cacheKey = `flood:${JSON.stringify(params)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;
    // TODO: implement flood-specific query
    const result = { total: 0, data: [] };
    await this.redis.setex(cacheKey, 120, JSON.stringify(result));
    return result;
  }
}
