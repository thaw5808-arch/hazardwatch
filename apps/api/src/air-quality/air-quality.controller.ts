import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AirQualityService } from './air-quality.service';

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  constructor(private readonly svc: AirQualityService) {}

  @Get('current')
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  getCurrent(@Query('lat') lat: string, @Query('lon') lon: string, @Query('radius_km') r?: string) {
    if (!lat || !lon) throw new BadRequestException('lat and lon required');
    return this.svc.getCurrent(parseFloat(lat), parseFloat(lon), r ? parseInt(r) : undefined);
  }

}
