'use client';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Wind, Cloud, Zap, Map, Bell, Settings, Droplets, Thermometer, Gauge, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
interface WeatherData { current: { temp_c: number; feels_like_c: number; weather_desc: string; humidity_pct: number; pressure_hpa: number; wind_speed_ms: number; wind_dir_deg: number } }
interface EqData { total: number; earthquakes: Array<{ magnitude: number; place_name: string; occurred_at: string }> }
interface AQIData { aqi: number; aqi_label: string; pm25: number | null; pm10: number | null; o3: number | null; no2: number | null; recorded_at: string }
export default function DashboardPage() {
  const { lat, lon } = useGeolocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [earthquakes, setEarthquakes] = useState<EqData | null>(null);
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLon, setCustomLon] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const fetchAll = async (overrideLat?: number, overrideLon?: number) => {
    const activeLat = overrideLat ?? customLat ?? lat;
    const activeLon = overrideLon ?? customLon ?? lon;
    if (!activeLat || !activeLon) return;
    const api = process.env.NEXT_PUBLIC_API_URL;
    setRefreshing(true);
    await Promise.all([
      fetch(`${api}/v1/weather/current?lat=${activeLat}&lon=${activeLon}`)
        .then(r => r.json()).then(setWeather as (v: unknown) => void).catch(() => null),
      fetch(`${api}/v1/earthquakes?lat=${activeLat}&lon=${activeLon}&radius_km=500&hours=24&min_magnitude=4`)
        .then(r => r.json()).then(setEarthquakes as (v: unknown) => void).catch(() => null),
      fetch(`${api}/v1/weather/aqi?lat=${activeLat}&lon=${activeLon}`)
        .then(r => r.json()).then(setAqiData as (v: unknown) => void).catch(() => null),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAll();
  }, [lat, lon]);

  

  return (
    <div
      className="p-6 min-h-screen relative"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,0.65), rgba(3,7,18,0.75)), url('/images/overview-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
  <h1 className="text-2xl font-bold">Overview</h1>
  <div className="flex items-center gap-3 flex-wrap">
    <LocationSearch
      currentLabel={locationLabel ?? undefined}
      onSelect={(newLat, newLon, label) => {
        setCustomLat(newLat);
        setCustomLon(newLon);
        setLocationLabel(label);
        void fetchAll(newLat, newLon);
      }}
    />
    <button
      onClick={() => fetchAll()}
      disabled={refreshing}
      className="flex items-center gap-2 bg-gray-900/40 hover:bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>
</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Weather card */}
        <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
            <span>🌤️</span> Current weather
          </div>
          {weather ? (
            <>
              <div className="text-4xl font-bold mb-1">{weather.current.temp_c.toFixed(1)}°C</div>
              <div className="text-gray-400 capitalize">{weather.current.weather_desc}</div>
              <div className="mt-3 flex gap-4 text-sm text-gray-500">
                <span>💧 {weather.current.humidity_pct}%</span>
                <span>💨 {weather.current.wind_speed_ms} m/s</span>
              </div>
            </>
          ) : (
            <div className="text-gray-600">{lat ? 'Loading...' : 'Enable location for weather'}</div>
          )}
        </div>

        {/* Earthquake feed */}
        <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 md:col-span-2">
          <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
            <span>⚡</span> Recent earthquakes nearby (24h)
          </div>
          {earthquakes ? (
            earthquakes.earthquakes.length > 0 ? (
              <div className="space-y-2">
                {earthquakes.earthquakes.slice(0, 5).map((eq, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`font-bold w-8 text-center rounded px-1 ${
                      eq.magnitude >= 6 ? 'text-red-400' :
                      eq.magnitude >= 5 ? 'text-orange-400' : 'text-yellow-400'}`}>
                      M{eq.magnitude}
                    </span>
                    <span className="text-gray-300 flex-1 truncate">{eq.place_name}</span>
                    <span className="text-gray-600 text-xs shrink-0">
                      {new Date(eq.occurred_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : <div className="text-gray-600">No significant earthquakes nearby</div>
          ) : <div className="text-gray-600">{lat ? 'Loading...' : 'Enable location'}</div>}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
          { href: '/dashboard/map',       icon: Map,      label: 'Open live map' },
          { href: '/dashboard/alerts',    icon: Bell,     label: 'View all alerts' },
          { href: '/dashboard/profile',   icon: Settings, label: 'Alert settings' },
        ].map((a) => (
          <a key={a.href} href={a.href}
          className="bg-gray-900/40 hover:bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors">
            <a.icon className="w-6 h-6 text-gray-300" />
            <span className="text-sm font-medium">{a.label}</span>
          </a>
        ))}
      </div>

{/* Live conditions — wind card */}
{weather && (
  <div className="mt-6 bg-gray-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/10">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
      <Wind className="w-4 h-4" />
        Live conditions
      </div>
      <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
        weather.current.wind_speed_ms * 3.6 < 20
          ? 'bg-green-500/10 text-green-400 border-green-500/20'
          : weather.current.wind_speed_ms * 3.6 < 40
          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          : weather.current.wind_speed_ms * 3.6 < 62
          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }`}>
        {weather.current.wind_speed_ms * 3.6 < 20 ? 'Calm'
          : weather.current.wind_speed_ms * 3.6 < 40 ? 'Moderate'
          : weather.current.wind_speed_ms * 3.6 < 62 ? 'Strong'
          : 'Dangerous'}
      </span>
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
      <div className="relative w-20 h-20 shrink-0">
        <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center relative">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-white/30">N</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/30">S</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30">E</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30">W</span>
          <div className="absolute" style={{ transform: `rotate(${weather.current.wind_dir_deg}deg)` }}>
            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-orange-400 rounded-full -translate-x-1/2 -translate-y-full" />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{(weather.current.wind_speed_ms * 3.6).toFixed(1)}</span>
          <span className="text-gray-400 text-sm">km/h</span>
        </div>
        <div className="text-gray-500 text-sm mt-1">
          {(['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'])[Math.round(weather.current.wind_dir_deg / 22.5) % 16]}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
      <div className="bg-white/5 rounded-xl p-3 text-center">
  <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
  <div className="text-xs text-gray-500 mb-1">Humidity</div>
  <div className="text-sm font-medium">{weather.current.humidity_pct}%</div>
</div>
<div className="bg-white/5 rounded-xl p-3 text-center">
  <Thermometer className="w-4 h-4 text-orange-400 mx-auto mb-1" />
  <div className="text-xs text-gray-500 mb-1">Feels like</div>
  <div className="text-sm font-medium">{weather.current.feels_like_c.toFixed(0)}°C</div>
</div>
<div className="bg-white/5 rounded-xl p-3 text-center">
  <Gauge className="w-4 h-4 text-purple-400 mx-auto mb-1" />
  <div className="text-xs text-gray-500 mb-1">Pressure</div>
  <div className="text-sm font-medium">{weather.current.pressure_hpa} hPa</div>
</div>
      </div>
    </div>
  </div>
)}
{/* AQI card */}
{aqiData && (
        <div className="mt-4 bg-gray-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Wind className="w-4 h-4" />
              Air quality index
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
              aqiData.aqi === 1 ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : aqiData.aqi === 2 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : aqiData.aqi === 3 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              : aqiData.aqi === 4 ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>{aqiData.aqi_label}</span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-5xl font-bold ${
              aqiData.aqi === 1 ? 'text-green-400'
              : aqiData.aqi === 2 ? 'text-yellow-400'
              : aqiData.aqi === 3 ? 'text-orange-400'
              : aqiData.aqi === 4 ? 'text-red-400'
              : 'text-purple-400'
            }`}>{aqiData.aqi}</span>
            <span className="text-gray-500 text-sm">/ 5</span>
          </div>

          <div className="relative h-2 rounded-full mb-4 overflow-hidden" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }}>
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-900"
              style={{ left: `calc(${((aqiData.aqi - 1) / 4) * 100}% - 6px)` }} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'PM2.5', val: aqiData.pm25 },
              { label: 'PM10',  val: aqiData.pm10 },
              { label: 'O₃',   val: aqiData.o3 },
              { label: 'NO₂',  val: aqiData.no2 },
            ].map(p => (
              <div key={p.label} className="bg-white/5 rounded-xl p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">{p.label}</div>
                <div className="text-sm font-medium">{p.val != null ? p.val.toFixed(1) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}


</div>
);
}
