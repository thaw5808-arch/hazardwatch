import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { VolcanoService } from './volcano.service';

@ApiTags('volcano')
@Controller('volcano')
export class VolcanoController {
  constructor(private readonly svc: VolcanoService) {}

  @Get()
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  getAll(@Query() q: Record<string, string>) {
    return this.svc.getAll({
      lat:      q['lat']       ? parseFloat(q['lat'])      : undefined,
      lon:      q['lon']       ? parseFloat(q['lon'])      : undefined,
      radiusKm: q['radius_km'] ? parseInt(q['radius_km'])  : undefined,
    });
  }

  @Get('test-ingest')
  async testIngest() {
    const count = await this.svc.ingestVolcanoes();
    return { upserted: count };
  }
}
