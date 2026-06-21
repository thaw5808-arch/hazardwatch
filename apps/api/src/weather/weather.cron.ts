import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { WeatherService } from './weather.service';

const MAJOR_CITIES = [
  { lat: 13.75, lon: 100.5,  name: 'Bangkok' },
  { lat: 1.35,  lon: 103.82, name: 'Singapore' },
  { lat: 3.14,  lon: 101.69, name: 'Kuala Lumpur' },
  { lat: 14.09, lon: 108.27, name: 'Vietnam' },
  { lat: -6.21, lon: 106.85, name: 'Jakarta' },
  { lat: 40.71, lon: -74.01, name: 'New York' },
  { lat: 51.51, lon: -0.13,  name: 'London' },
  { lat: 35.69, lon: 139.69, name: 'Tokyo' },
];

@Injectable()
export class WeatherCron {
  private readonly logger = new Logger(WeatherCron.name);

  constructor(
    private readonly weatherService: WeatherService,
    private readonly db: DatabaseService,
  ) {}

  @Cron('0 */5 * * * *')  // every 5 minutes
  async updateMajorCities() {
    for (const city of MAJOR_CITIES) {
      try {
        await this.weatherService.getCurrent(city.lat, city.lon);
      } catch (err) {
        this.logger.error(`Weather update failed for ${city.name}`, err);
      }
    }
  }
}
