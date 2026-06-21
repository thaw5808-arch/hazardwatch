export interface WeatherCurrent {
  location: { name: string; lat: number; lon: number };
  current: {
    temp_c: number;
    feels_like_c: number;
    humidity_pct: number;
    pressure_hpa: number;
    wind_speed_ms: number;
    wind_dir_deg: number;
    visibility_m: number | null;
    weather_code: number;
    weather_desc: string;
    recorded_at: string;
  };
}

export interface WeatherHourly {
  time: string;
  temp_c: number;
  precip_mm: number;
  wind_speed_ms: number;
  weather_code: number;
}

export interface WeatherDaily {
  date: string;
  high_c: number;
  low_c: number;
  precip_probability: number;
  precip_mm: number;
  weather_code: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecast {
  location: { name: string; lat: number; lon: number };
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}
