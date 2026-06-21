import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { WildfireService } from './wildfire.service';

@ApiTags('wildfires')
@Controller('wildfires')
export class WildfireController {
  constructor(private readonly svc: WildfireService) {}

  @Get()
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  @ApiQuery({ name: 'min_confidence', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getActive(@Query() q: Record<string, string>) {
    return this.svc.getActive({
      lat:           q['lat']            ? parseFloat(q['lat'])            : undefined,
      lon:           q['lon']            ? parseFloat(q['lon'])            : undefined,
      radiusKm:      q['radius_km']      ? parseInt(q['radius_km'])        : undefined,
      minConfidence: q['min_confidence'] ? parseInt(q['min_confidence'])   : undefined,
      limit:         q['limit']          ? parseInt(q['limit'])            : undefined,
    });
  }

  @Get('backfill-countries')
  backfillCountries() {
    return this.svc.backfillCountries();
  }

  
}
