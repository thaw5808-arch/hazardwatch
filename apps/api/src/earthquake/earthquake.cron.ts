import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EarthquakeService } from './earthquake.service';

@Injectable()
export class EarthquakeCron {
  private readonly logger = new Logger(EarthquakeCron.name);

  constructor(private readonly earthquakeService: EarthquakeService) {}

  @Cron('*/60 * * * * *')
  async pollUSGS() {
    try {
      await this.earthquakeService.ingestUSGSFeed();
    } catch (err) {
      this.logger.error('USGS ingest failed', err);
    }
  }
}
