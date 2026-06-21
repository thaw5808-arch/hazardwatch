import { Module } from '@nestjs/common';
import { VolcanoController } from './volcano.controller';
import { VolcanoService } from './volcano.service';
import { VolcanoCron } from './volcano.cron';

@Module({ controllers: [VolcanoController], providers: [VolcanoService, VolcanoCron], exports: [VolcanoService] })
export class VolcanoModule {}