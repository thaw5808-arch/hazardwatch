'use client';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getMagnitudeColor, formatRelativeTime } from '@/lib/utils';

interface Eq { id: string; magnitude: number; place_name: string; depth_km: number; occurred_at: string; tsunami_risk: boolean; distance_km?: number }

export default function EarthquakesPage() {
  const { lat, lon } = useGeolocation();
  const [data, setData] = useState<Eq[]>([]);
  const [loading, setLoading] = useState(true);
  const [minMag, setMinMag] = useState(2.5);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL;
    const params = new URLSearchParams({ min_magnitude: String(minMag), hours: '48', limit: '100' });
    if (lat && lon) { params.set('lat', String(lat)); params.set('lon', String(lon)); }
    void fetch(`${api}/v1/earthquakes?${params}`).then(r => r.json())
      .then((d: unknown) => { setData((d as { earthquakes: Eq[] }).earthquakes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lat, lon, minMag]);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Earthquakes</h1>
        <select value={minMag} onChange={e => setMinMag(parseFloat(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
          <option value={2}>M2.0+</option>
          <option value={2.5}>M2.5+</option>
          <option value={4}>M4.0+</option>
          <option value={5}>M5.0+</option>
          <option value={6}>M6.0+</option>
        </select>
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : (
        <div className="space-y-2">
          {data.map(eq => (
            <div key={eq.id} className="bg-gray-900/15 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className={`text-xl font-bold w-20 text-center shrink-0 ${getMagnitudeColor(eq.magnitude)}`}>
                M{eq.magnitude}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{eq.place_name}</div>
                <div className="text-sm text-gray-500">
                  {eq.depth_km}km deep · {formatRelativeTime(eq.occurred_at)}
                  {eq.distance_km ? ` · ${eq.distance_km}km away` : ''}
                </div>
              </div>
              {eq.tsunami_risk && (
                <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">
                  Tsunami risk
                </span>
              )}
            </div>
          ))}
          {data.length === 0 && <div className="text-center py-12 text-gray-500">No earthquakes found for these filters</div>}
        </div>
      )}
    </div>
    </div>
  );
}
