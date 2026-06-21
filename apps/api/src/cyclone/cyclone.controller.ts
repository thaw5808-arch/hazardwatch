import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { CycloneService } from './cyclone.service';

@ApiTags('cyclone')
@Controller('cyclone')
export class CycloneController {
  constructor(private readonly svc: CycloneService) {}

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

}
