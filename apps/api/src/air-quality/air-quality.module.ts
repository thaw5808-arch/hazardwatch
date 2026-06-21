import { Module } from '@nestjs/common';
import { AirQualityController } from './air-quality.controller';
import { AirQualityService } from './air-quality.service';
import { AirQualityCron } from './air-quality.cron';

@Module({ controllers: [AirQualityController], providers: [AirQualityService, AirQualityCron], exports: [AirQualityService] })
export class AirQualityModule {}
