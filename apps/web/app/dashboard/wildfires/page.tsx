'use client';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatRelativeTime } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface Fire { id: string; country: string; confidence: number|null; frp: number|string|null; last_detected: string; distance_km?: number }

export default function WildfiresPage() {
  const { lat, lon } = useGeolocation();
  const [fires, setFires] = useState<Fire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100', min_confidence: '50' });
    if (lat && lon) { params.set('lat', String(lat)); params.set('lon', String(lon)); }
    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/wildfires?${params}`)
      .then(r => r.json())
      .then((d: unknown) => { setFires((d as { wildfires: Fire[] }).wildfires ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lat, lon]);

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
      <h1 className="text-2xl font-bold mb-6">Active Wildfires</h1>
      {loading ? <div className="text-gray-400">Loading...</div> :
        fires.length === 0 ? (
          <div className="text-center py-16 text-gray-500"><Flame className="w-10 h-10 text-orange-400 mx-auto mb-3" />No active wildfires detected</div>
        ) : (
          <div className="space-y-2">
            {fires.map(f => (
              <div key={f.id} className="bg-gray-900/15 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <Flame className="w-6 h-6 text-orange-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{f.country}</div>
                  <div className="text-sm text-gray-500">
                    Confidence: {f.confidence ?? '?'}% · FRP: {f.frp !== null && !isNaN(Number(f.frp)) ? Number(f.frp).toFixed(0) : '?'} MW
                    {f.distance_km ? ` · ${f.distance_km}km away` : ''} · {formatRelativeTime(f.last_detected)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
    </div>
  );
}
