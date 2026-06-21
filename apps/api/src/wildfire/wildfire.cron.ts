import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WildfireService } from './wildfire.service';

@Injectable()
export class WildfireCron {
  private readonly logger = new Logger(WildfireCron.name);
  constructor(private readonly svc: WildfireService) {}

  @Cron('0 */15 * * * *')
  async pollFIRMS() {
    try { await this.svc.ingestFIRMS(); }
    catch (err) { this.logger.error('FIRMS ingest failed', err); }
  }
}
