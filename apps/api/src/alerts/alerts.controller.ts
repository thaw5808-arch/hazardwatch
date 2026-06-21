import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Get()
  @ApiQuery({ name: 'lat',      required: false, type: Number })
  @ApiQuery({ name: 'lon',      required: false, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  @ApiQuery({ name: 'limit',    required: false, type: Number })
  getActive(@Query() q: Record<string, string>) {
    return this.svc.getActive({
      lat:      q['lat']       ? parseFloat(q['lat'])     : undefined,
      lon:      q['lon']       ? parseFloat(q['lon'])     : undefined,
      radiusKm: q['radius_km'] ? parseInt(q['radius_km']) : undefined,
      limit:    q['limit']     ? parseInt(q['limit'])     : undefined,
    });
  }
}
