import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { EarthquakeModule } from './earthquake/earthquake.module';
import { WeatherModule } from './weather/weather.module';
import { CycloneModule } from './cyclone/cyclone.module';
import { WildfireModule } from './wildfire/wildfire.module';
import { AirQualityModule } from './air-quality/air-quality.module';
import { FloodModule } from './flood/flood.module';
import { TsunamiModule } from './tsunami/tsunami.module';
import { VolcanoModule } from './volcano/volcano.module';
import { AlertsModule } from './alerts/alerts.module';
import { EmergencyModule } from './emergency/emergency.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 60000, limit: 200 },
      { name: 'ai',     ttl: 60000, limit: 10  },
    ]),
    DatabaseModule,
    RedisModule,
    EarthquakeModule,
    WeatherModule,
    CycloneModule,
    WildfireModule,
    AirQualityModule,
    FloodModule,
    TsunamiModule,
    VolcanoModule,
    AlertsModule,
    EmergencyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
