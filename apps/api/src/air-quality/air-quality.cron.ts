import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AirQualityService } from './air-quality.service';

@Injectable()
export class AirQualityCron {
  private readonly logger = new Logger(AirQualityCron.name);
  constructor(private readonly svc: AirQualityService) {}

  @Cron('0 */10 * * * *')
  async pollOpenAQ() {
    try { await this.svc.ingestOpenAQ(); }
    catch (err) { this.logger.error('OpenAQ ingest failed', err); }
  }
}
