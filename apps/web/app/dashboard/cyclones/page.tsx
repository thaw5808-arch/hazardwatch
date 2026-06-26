'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tornado } from 'lucide-react';

interface Cyclone { id: string; name: string; storm_type: string; category: number|null; wind_speed_kts: number|null; pressure_mb: number|null; basin: string; last_updated_at: string; lat?: number; lon?: number }

function stormLabel(type: string, category: number | null): string {
  const labels: Record<string, string> = {
    super_typhoon: 'Super Typhoon', typhoon: 'Typhoon', hurricane: 'Hurricane',
    tropical_storm: 'Tropical Storm', tropical_depression: 'Tropical Depression',
    subtropical_storm: 'Subtropical Storm', subtropical_depression: 'Subtropical Depression',
    post_tropical: 'Post-Tropical', unknown: 'Tropical System',
  };
  const label = labels[type] ?? type.replace(/_/g, ' ');
  if (category && (type === 'hurricane' || type === 'typhoon' || type === 'super_typhoon')) {
    return `${label} (Cat ${category})`;
  }
  return label;
}

function stormColor(type: string): string {
  if (type === 'super_typhoon') return 'text-red-400 border-red-500/30 bg-red-500/10';
  if (type === 'typhoon' || type === 'hurricane') return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  if (type === 'tropical_storm') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
}

function stormEmoji(type: string): string {
  if (type === 'super_typhoon' || type === 'typhoon') return '🌀';
  if (type === 'hurricane') return '🌀';
  if (type === 'tropical_storm') return '⛈️';
  if (type === 'tropical_depression') return '🌧️';
  return '🌪️';
}

export default function CyclonesPage() {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
              <div
                key={c.id}
                onClick={() => c.lat && c.lon && router.push(`/dashboard/map?lat=${c.lat}&lon=${c.lon}&zoom=6`)}
                className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:border-white/20 hover:bg-gray-900/60 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{stormEmoji(c.storm_type)}</span>
                  <div>
                    <div className="font-bold text-lg">{c.name}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${stormColor(c.storm_type)}`}>
                      {stormLabel(c.storm_type, c.category)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-400 mt-2">
                  <span>🌍 {c.basin} basin</span>
                  {c.wind_speed_kts && <span>💨 {c.wind_speed_kts} kts ({Math.round(c.wind_speed_kts * 1.852)} km/h)</span>}
                  {c.pressure_mb && <span>🔵 {c.pressure_mb} mb</span>}
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
