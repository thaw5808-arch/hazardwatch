import { Module } from '@nestjs/common';
import { WildfireController } from './wildfire.controller';
import { WildfireService } from './wildfire.service';
import { WildfireCron } from './wildfire.cron';

@Module({ controllers: [WildfireController], providers: [WildfireService, WildfireCron], exports: [WildfireService] })
export class WildfireModule {}
