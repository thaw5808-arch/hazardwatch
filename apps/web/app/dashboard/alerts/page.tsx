'use client';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface AlertItem { id: string; hazard_type: string; severity: string; title: string; summary: string; issued_at: string }

const SEVERITY_COLORS: Record<string, string> = {
  info:      'border-blue-500/50 bg-blue-500/5',
  low:       'border-green-500/50 bg-green-500/5',
  moderate:  'border-yellow-500/50 bg-yellow-500/5',
  high:      'border-orange-500/50 bg-orange-500/5',
  critical:  'border-red-500/50 bg-red-500/5',
  emergency: 'border-purple-500/50 bg-purple-500/5',
};

export default function AlertsPage() {
  const { lat, lon } = useGeolocation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL;
    const url = lat && lon ? `${api}/v1/alerts?lat=${lat}&lon=${lon}&radius_km=500` : `${api}/v1/alerts`;
    void fetch(url).then(r => r.json())
      .then((d: unknown) => { setAlerts((d as { alerts: AlertItem[] }).alerts ?? []); setLoading(false); })
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
      <h1 className="text-2xl font-bold mb-6">Alert Center</h1>
      {loading ? (
        <div className="text-gray-400">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl text-center py-16 text-gray-500">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          No active alerts in your area
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={cn('rounded-xl border backdrop-blur-md p-4', SEVERITY_COLORS[a.severity] ?? SEVERITY_COLORS['low'])}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider font-medium text-gray-400">{a.hazard_type}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
                      'bg-red-500/20 text-red-400': a.severity === 'critical' || a.severity === 'emergency',
                      'bg-orange-500/20 text-orange-400': a.severity === 'high',
                      'bg-yellow-500/20 text-yellow-400': a.severity === 'moderate',
                    })}>{a.severity}</span>
                  </div>
                  <div className="font-semibold mb-1">{a.title}</div>
                  <div className="text-sm text-gray-400">{a.summary}</div>
                </div>
                <div className="text-xs text-gray-600 shrink-0">
                  {new Date(a.issued_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
