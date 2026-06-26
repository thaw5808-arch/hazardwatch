import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CycloneService } from './cyclone.service';

@Injectable()
export class CycloneCron {
  private readonly logger = new Logger(CycloneCron.name);
  constructor(private readonly svc: CycloneService) {}

  @Cron('0 */15 * * * *')
  async handleCron() {
    try { await this.svc.ingestNHC(); } catch (err) { this.logger.error(`NHC ingest failed: ${(err as Error).message}`); }
    try { await this.svc.ingestJTWC(); } catch (err) { this.logger.error(`JTWC ingest failed: ${(err as Error).message}`); }
  }
}