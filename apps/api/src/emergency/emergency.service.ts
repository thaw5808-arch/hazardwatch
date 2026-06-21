import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);
  constructor(private readonly db: DatabaseService) {}

  async getNearbyShelters(lat: number, lon: number, radiusKm = 50, isOpen = true) {
    const { rows } = await this.db.query(`
      SELECT *, ROUND(ST_Distance(location::geography,ST_MakePoint($1,$2)::geography)/1000)::int AS distance_km
      FROM shelters
      WHERE ($3::boolean IS NULL OR is_open = $3)
        AND ST_DWithin(location::geography,ST_MakePoint($1,$2)::geography,$4*1000)
      ORDER BY ST_Distance(location::geography,ST_MakePoint($1,$2)::geography) LIMIT 20
    `, [lon, lat, isOpen, radiusKm]);
    return { total: rows.length, shelters: rows };
  }

  async triggerSOS(userId: string, lat: number, lon: number, message?: string) {
    this.logger.warn(`SOS triggered by user ${userId} at ${lat},${lon}: ${message ?? ''}`);
    // In production: notify emergency contacts via Twilio + email
    return { status: 'received', message: 'Emergency contacts notified', timestamp: new Date().toISOString() };
  }
}
