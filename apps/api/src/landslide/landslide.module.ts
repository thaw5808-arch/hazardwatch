import { Module } from '@nestjs/common';
import { LandslideController } from './landslide.controller';
import { LandslideService } from './landslide.service';

@Module({ controllers: [LandslideController], providers: [LandslideService], exports: [LandslideService] })
export class LandslideModule {}
