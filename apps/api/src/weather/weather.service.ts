import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly OW_BASE = 'https://api.openweathermap.org/data/2.5';
  private readonly OM_BASE = 'https://api.open-meteo.com/v1';

  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  async getCurrent(lat: number, lon: number) {
    const cacheKey = `weather:current:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const { data } = await axios.get(`${this.OW_BASE}/weather`, {
      params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' },
      timeout: 8000,
    });

    const result = {
      location: { name: data.name as string, lat, lon },
      current: {
        temp_c:        data.main.temp as number,
        feels_like_c:  data.main.feels_like as number,
        humidity_pct:  data.main.humidity as number,
        pressure_hpa:  data.main.pressure as number,
        wind_speed_ms: data.wind.speed as number,
        wind_dir_deg:  data.wind.deg as number,
        visibility_m:  (data.visibility as number) ?? null,
        weather_code:  (data.weather as Array<{ id: number }>)[0].id,
        weather_desc:  (data.weather as Array<{ description: string }>)[0].description,
        recorded_at:   new Date().toISOString(),
      },
    };

    await this.db.query(`
      INSERT INTO weather_readings
        (location, location_name, source, recorded_at, temp_c, feels_like_c,
         humidity_pct, pressure_hpa, wind_speed_ms, wind_dir_deg,
         visibility_m, weather_code, weather_desc, raw_data)
      VALUES
        (ST_MakePoint($1,$2)::geography, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      lon, lat,
      data.name, 'openweather',
      result.current.temp_c,
      result.current.feels_like_c,
      result.current.humidity_pct,
      result.current.pressure_hpa,
      result.current.wind_speed_ms,
      result.current.wind_dir_deg,
      result.current.visibility_m,
      result.current.weather_code,
      result.current.weather_desc,
      JSON.stringify(data),
    ]);

    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  async getForecast(lat: number, lon: number) {
    const cacheKey = `weather:forecast:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const { data } = await axios.get(`${this.OM_BASE}/forecast`, {
      params: {
        latitude: lat, longitude: lon,
        hourly: 'temperature_2m,precipitation,wind_speed_10m,weathercode',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,sunrise,sunset',
        timezone: 'auto', forecast_days: 7,
      },
      timeout: 8000,
    });

    const hourly = (data.hourly.time as string[]).slice(0, 48).map((t: string, i: number) => ({
      time:          t,
      temp_c:        (data.hourly.temperature_2m as number[])[i],
      precip_mm:     (data.hourly.precipitation as number[])[i],
      wind_speed_ms: (data.hourly.wind_speed_10m as number[])[i],
      weather_code:  (data.hourly.weathercode as number[])[i],
    }));

    const daily = (data.daily.time as string[]).map((t: string, i: number) => ({
      date:               t,
      high_c:             (data.daily.temperature_2m_max as number[])[i],
      low_c:              (data.daily.temperature_2m_min as number[])[i],
      precip_mm:          (data.daily.precipitation_sum as number[])[i],
      precip_probability: (data.daily.precipitation_probability_max as number[])[i] / 100,
      weather_code:       (data.daily.weathercode as number[])[i],
      sunrise:            (data.daily.sunrise as string[])[i],
      sunset:             (data.daily.sunset as string[])[i],
    }));

    const result = { location: { lat, lon }, hourly, daily };
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }
  async getAqi(lat: number, lon: number) {
    const cacheKey = `weather:aqi:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const { data } = await axios.get(`${this.OW_BASE}/air_pollution`, {
      params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY },
      timeout: 8000,
    });

    const c = (data.list[0].components as Record<string, number>);
    const aqiIndex = data.list[0].main.aqi as number;

    const result = {
      aqi: aqiIndex,
      aqi_label: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqiIndex - 1] ?? 'Unknown',
      pm25: c['pm2_5'] ?? null,
      pm10: c['pm10'] ?? null,
      o3: c['o3'] ?? null,
      no2: c['no2'] ?? null,
      so2: c['so2'] ?? null,
      co: c['co'] ?? null,
      recorded_at: new Date().toISOString(),
    };

    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }
  async geocode(q: string) {
    const cacheKey = `weather:geocode:${q.toLowerCase().trim()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const { data } = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q, limit: 5, appid: process.env.OPENWEATHER_API_KEY },
      timeout: 8000,
    });

    const result = (data as Array<Record<string, unknown>>).map(r => ({
      name:    r['name'],
      country: r['country'],
      state:   r['state'] ?? null,
      lat:     r['lat'],
      lon:     r['lon'],
    }));

    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
    return result;
  }
}
