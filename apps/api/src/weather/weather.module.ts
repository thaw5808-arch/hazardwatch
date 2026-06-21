import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherCron } from './weather.cron';

@Module({
  controllers: [WeatherController],
  providers: [WeatherService, WeatherCron],
  exports: [WeatherService],
})
export class WeatherModule {}
