'use client';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getWeatherVisual } from '@/lib/weather-icons';
import { Droplets, Wind } from 'lucide-react';

interface CurrentWeather {
  location: { name: string };
  current: {
    temp_c: number; feels_like_c: number; weather_desc: string;
    humidity_pct: number; wind_speed_ms: number; pressure_hpa: number;
  };
}

interface HourlyEntry { time: string; temp_c: number; precip_mm: number; wind_speed_ms: number; weather_code: number }
interface DailyEntry {
  date: string; high_c: number; low_c: number; precip_mm: number;
  precip_probability: number; weather_code: number; sunrise: string; sunset: string;
}
interface ForecastData { location: { lat: number; lon: number }; hourly: HourlyEntry[]; daily: DailyEntry[] }

function isDaytime(iso: string, sunrise?: string, sunset?: string): boolean {
  if (!sunrise || !sunset) return true;
  const t = new Date(iso).getTime();
  return t >= new Date(sunrise).getTime() && t <= new Date(sunset).getTime();
}

function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}

export default function WeatherPage() {
  const { lat, lon } = useGeolocation();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lon) return;
    const api = process.env.NEXT_PUBLIC_API_URL;
    Promise.all([
      fetch(`${api}/v1/weather/current?lat=${lat}&lon=${lon}`).then(r => { if (!r.ok) throw new Error('current failed'); return r.json(); }),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,sunrise,sunset&timezone=auto&forecast_days=7`).then(r => { if (!r.ok) throw new Error('forecast failed'); return r.json(); }).then(data => ({
        location: { lat, lon },
        hourly: (data.hourly.time).slice(0, 48).map((t, i) => ({ time: t, temp_c: data.hourly.temperature_2m[i], precip_mm: data.hourly.precipitation[i], wind_speed_ms: data.hourly.wind_speed_10m[i], weather_code: data.hourly.weathercode[i] })),
        daily: (data.daily.time).map((t, i) => ({ date: t, high_c: data.daily.temperature_2m_max[i], low_c: data.daily.temperature_2m_min[i], precip_mm: data.daily.precipitation_sum[i], precip_probability: data.daily.precipitation_probability_max[i] / 100, weather_code: data.daily.weathercode[i], sunrise: data.daily.sunrise[i], sunset: data.daily.sunset[i] }))
      })),
    ])
      .then(([currentData, forecastData]) => {
        setWeather(currentData as CurrentWeather);
        setForecast(forecastData as ForecastData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lat, lon]);

  if (!lat) return <div className="p-6 text-gray-400">Enable location to see weather</div>;

  const today = forecast?.daily?.[0];
  const nowIso = new Date().toISOString();
  const currentVisual = weather
    ? getWeatherVisual(
        forecast?.hourly?.[0]?.weather_code ?? 0,
        isDaytime(nowIso, today?.sunrise, today?.sunset),
      )
    : null;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,0.65), rgba(3,7,18,0.75)), url('/images/overview-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Weather</h1>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : weather && currentVisual ? (
          <>
            {/* Current conditions */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/10 p-8 mb-6">
              <div className="text-gray-400 mb-4">{weather.location.name}</div>
              <div className="flex items-center gap-6">
                <currentVisual.Icon className={`w-20 h-20 ${currentVisual.color}`} strokeWidth={1.5} />
                <div>
                  <div className="text-6xl font-bold leading-none mb-1">
                    {weather.current.temp_c.toFixed(0)}°
                  </div>
                  <div className="text-lg text-gray-300 capitalize">{weather.current.weather_desc}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {[
                  { label: 'Feels like', value: `${weather.current.feels_like_c.toFixed(0)}°C` },
                  { label: 'Humidity',   value: `${weather.current.humidity_pct}%` },
                  { label: 'Wind',       value: `${weather.current.wind_speed_ms} m/s` },
                  { label: 'Pressure',   value: `${weather.current.pressure_hpa} hPa` },
                ].map(item => (
                  <div key={item.label} className="bg-gray-800 rounded-xl p-4">
                    <div className="text-gray-500 text-sm">{item.label}</div>
                    <div className="font-semibold text-lg">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-day forecast strip */}
            {forecast && forecast.daily.length > 0 && (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-6">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
                  7-day forecast
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {forecast.daily.map((day, i) => {
                    const visual = getWeatherVisual(day.weather_code, true);
                    return (
                      <div
                        key={day.date}
                        className="flex flex-col items-center shrink-0 w-20 py-3 rounded-xl bg-gray-800/60"
                      >
                        <div className="text-sm text-gray-300 font-medium mb-2">
                          {formatDayLabel(day.date, i)}
                        </div>
                        <visual.Icon className={`w-7 h-7 ${visual.color} mb-2`} strokeWidth={1.5} />
                        {day.precip_probability > 0.2 && (
                          <div className="flex items-center gap-0.5 text-xs text-blue-400 mb-1">
                            <Droplets className="w-3 h-3" />
                            {Math.round(day.precip_probability * 100)}%
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="font-semibold">{Math.round(day.high_c)}°</span>
                          <span className="text-gray-500 ml-1">{Math.round(day.low_c)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hourly strip */}
            {forecast && forecast.hourly.length > 0 && (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/10 p-5">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
                  Next 24 hours
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {forecast.hourly.slice(0, 24).map((hour, i) => {
                    const visual = getWeatherVisual(
                      hour.weather_code,
                      isDaytime(hour.time, today?.sunrise, today?.sunset),
                    );
                    return (
                      <div key={hour.time} className="flex flex-col items-center shrink-0 w-14">
                        <div className="text-xs text-gray-500 mb-2">
                          {i === 0 ? 'Now' : formatHourLabel(hour.time)}
                        </div>
                        <visual.Icon className={`w-6 h-6 ${visual.color} mb-2`} strokeWidth={1.5} />
                        <div className="text-sm font-medium">{Math.round(hour.temp_c)}°</div>
                        {hour.wind_speed_ms > 8 && (
                          <div className="flex items-center gap-0.5 text-[10px] text-gray-500 mt-1">
                            <Wind className="w-2.5 h-2.5" />
                            {Math.round(hour.wind_speed_ms)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400">Unable to load weather data</div>
        )}
      </div>
    </div>
  );
}
