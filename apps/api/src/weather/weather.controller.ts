import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly svc: WeatherService) {}

  @Get('current')
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  getCurrent(@Query('lat') lat: string, @Query('lon') lon: string) {
    if (!lat || !lon) throw new BadRequestException('lat and lon are required');
    return this.svc.getCurrent(parseFloat(lat), parseFloat(lon));
  }

  @Get('forecast')
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  getForecast(@Query('lat') lat: string, @Query('lon') lon: string) {
    if (!lat || !lon) throw new BadRequestException('lat and lon are required');
    return this.svc.getForecast(parseFloat(lat), parseFloat(lon));
  }
  @Get('aqi')
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  getAqi(@Query('lat') lat: string, @Query('lon') lon: string) {
    if (!lat || !lon) throw new BadRequestException('lat and lon are required');
    return this.svc.getAqi(parseFloat(lat), parseFloat(lon));
  }
  @Get('geocode')
  @ApiQuery({ name: 'q', required: true, type: String })
  geocode(@Query('q') q: string) {
    if (!q) throw new BadRequestException('q (city name) is required');
    return this.svc.geocode(q);
  }
}
