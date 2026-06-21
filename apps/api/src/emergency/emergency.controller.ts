import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';

@ApiTags('emergency')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly svc: EmergencyService) {}

  @Get('shelters')
  getShelters(@Query('lat') lat: string, @Query('lon') lon: string, @Query('radius_km') r?: string) {
    return this.svc.getNearbyShelters(parseFloat(lat), parseFloat(lon), r ? parseInt(r) : undefined);
  }

  @Post('sos')
  sos(@Body() body: { lat: number; lon: number; message?: string; userIdentifier?: string }) {
    return this.svc.triggerSOS(body.userIdentifier ?? 'anonymous', body.lat, body.lon, body.message);
  }
}
