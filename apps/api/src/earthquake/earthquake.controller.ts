import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { EarthquakeService } from './earthquake.service';

@ApiTags('earthquakes')
@Controller('earthquakes')
export class EarthquakeController {
  constructor(private readonly svc: EarthquakeService) {}

  @Get()
  @ApiQuery({ name: 'lat',           required: false, type: Number })
  @ApiQuery({ name: 'lon',           required: false, type: Number })
  @ApiQuery({ name: 'radius_km',     required: false, type: Number })
  @ApiQuery({ name: 'min_magnitude', required: false, type: Number })
  @ApiQuery({ name: 'hours',         required: false, type: Number })
  @ApiQuery({ name: 'limit',         required: false, type: Number })
  getRecent(@Query() q: Record<string, string>) {
    return this.svc.getRecent({
      lat:          q['lat']           ? parseFloat(q['lat'])           : undefined,
      lon:          q['lon']           ? parseFloat(q['lon'])           : undefined,
      radiusKm:     q['radius_km']     ? parseInt(q['radius_km'])       : undefined,
      minMagnitude: q['min_magnitude'] ? parseFloat(q['min_magnitude']) : undefined,
      hours:        q['hours']         ? parseInt(q['hours'])           : undefined,
      limit:        q['limit']         ? parseInt(q['limit'])           : undefined,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }
}
