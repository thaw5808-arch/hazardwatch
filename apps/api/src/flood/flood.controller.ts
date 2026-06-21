import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { FloodService } from './flood.service';

@ApiTags('flood')
@Controller('flood')
export class FloodController {
  constructor(private readonly svc: FloodService) {}

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
