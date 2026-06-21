import { Module } from '@nestjs/common';
import { FloodController } from './flood.controller';
import { FloodService } from './flood.service';

@Module({ controllers: [FloodController], providers: [FloodService], exports: [FloodService] })
export class FloodModule {}
