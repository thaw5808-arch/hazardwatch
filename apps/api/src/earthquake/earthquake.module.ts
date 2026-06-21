import { Module } from '@nestjs/common';
import { EarthquakeController } from './earthquake.controller';
import { EarthquakeService } from './earthquake.service';
import { EarthquakeCron } from './earthquake.cron';
import { EarthquakeGateway } from './earthquake.gateway';

@Module({
  controllers: [EarthquakeController],
  providers: [EarthquakeService, EarthquakeCron, EarthquakeGateway],
  exports: [EarthquakeService],
})
export class EarthquakeModule {}
