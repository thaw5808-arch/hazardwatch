import {
  Sun, Cloud, Cloudy, CloudDrizzle, CloudRain, CloudRainWind,
  CloudSnow, CloudLightning, CloudFog, CloudSun, Snowflake, HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface WeatherVisual {
  Icon: LucideIcon;
  color: string;
  label: string;
}

// Open-Meteo WMO weather codes -> icon, color, label
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)
export function getWeatherVisual(code: number, isDay = true): WeatherVisual {
  if (code === 0) {
    return isDay
      ? { Icon: Sun, color: 'text-amber-400', label: 'Clear sky' }
      : { Icon: Sun, color: 'text-indigo-300', label: 'Clear sky' };
  }
  if (code === 1 || code === 2) {
    return isDay
      ? { Icon: CloudSun, color: 'text-amber-300', label: 'Partly cloudy' }
      : { Icon: Cloud, color: 'text-slate-300', label: 'Partly cloudy' };
  }
  if (code === 3) {
    return { Icon: Cloudy, color: 'text-slate-400', label: 'Overcast' };
  }
  if (code === 45 || code === 48) {
    return { Icon: CloudFog, color: 'text-slate-400', label: 'Fog' };
  }
  if (code >= 51 && code <= 57) {
    return { Icon: CloudDrizzle, color: 'text-sky-400', label: 'Drizzle' };
  }
  if (code >= 61 && code <= 67) {
    return { Icon: CloudRain, color: 'text-blue-400', label: 'Rain' };
  }
  if (code >= 71 && code <= 77) {
    return { Icon: Snowflake, color: 'text-cyan-300', label: 'Snow' };
  }
  if (code === 80 || code === 81 || code === 82) {
    return { Icon: CloudRainWind, color: 'text-blue-400', label: 'Rain showers' };
  }
  if (code === 85 || code === 86) {
    return { Icon: CloudSnow, color: 'text-cyan-300', label: 'Snow showers' };
  }
  if (code >= 95 && code <= 99) {
    return { Icon: CloudLightning, color: 'text-orange-400', label: 'Thunderstorm' };
  }
  return { Icon: HelpCircle, color: 'text-gray-500', label: 'Unknown' };
}
