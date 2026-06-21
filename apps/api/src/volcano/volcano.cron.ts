import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VolcanoService } from './volcano.service';

@Injectable()
export class VolcanoCron {
  private readonly logger = new Logger(VolcanoCron.name);
  constructor(private readonly svc: VolcanoService) {}

  @Cron('0 */30 * * * *')
  async handleCron() {
    try { await this.svc.ingestVolcanoes(); }
    catch (err) { this.logger.error(`Volcano ingest failed: ${(err as Error).message}`); }
  }
}
