import { Module } from '@nestjs/common';
import { CycloneController } from './cyclone.controller';
import { CycloneService } from './cyclone.service';
import { CycloneCron } from './cyclone.cron';

@Module({
  controllers: [CycloneController],
  providers: [CycloneService, CycloneCron],
  exports: [CycloneService],
})
export class CycloneModule {}
