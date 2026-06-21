'use client';
import { useEffect, useState } from 'react';
import { Tornado } from 'lucide-react';

interface Cyclone { id: string; name: string; storm_type: string; category: number|null; wind_speed_kts: number|null; basin: string; last_updated_at: string }

export default function CyclonesPage() {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cyclone`)
      .then(r => r.json())
      .then((d: unknown) => { setCyclones((d as { data: Cyclone[] }).data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
      <h1 className="text-2xl font-bold mb-6">Tropical Systems</h1>
      {loading ? <div className="text-gray-400">Loading...</div> :
        cyclones.length === 0 ? (
          <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl text-center py-16 text-gray-500">
            <Tornado className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            No active tropical systems
          </div>
        ) : (
          <div className="space-y-3">
            {cyclones.map(c => (
              <div key={c.id} className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="font-bold text-lg">{c.name}</div>
                <div className="text-gray-400 text-sm">{c.storm_type} · {c.basin} basin · {c.wind_speed_kts ? `${c.wind_speed_kts} kts` : 'wind unknown'}</div>
              </div>
            ))}
          </div>
        )
      }
    </div>
    </div>
  );
}
