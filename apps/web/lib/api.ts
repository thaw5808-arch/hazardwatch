const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  weather: {
    current:  (lat: number, lon: number) => request(`/v1/weather/current?lat=${lat}&lon=${lon}`),
    forecast: (lat: number, lon: number) => request(`/v1/weather/forecast?lat=${lat}&lon=${lon}`),
  },
  earthquakes: {
    getRecent: (p: Record<string, string | number>) =>
      request(`/v1/earthquakes?${new URLSearchParams(p as Record<string, string>)}`),
  },
  cyclones: { getActive: () => request('/v1/cyclones/active') },
  wildfires: {
    getActive: (p: Record<string, string | number>) =>
      request(`/v1/wildfires?${new URLSearchParams(p as Record<string, string>)}`),
  },
  alerts: {
    getActive: (p: Record<string, string | number>) =>
      request(`/v1/alerts?${new URLSearchParams(p as Record<string, string>)}`),
  },
  assistant: {
    query: (body: { query: string; lat?: number; lon?: number }, token: string) =>
      request('/v1/assistant/query', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
  emergency: {
    shelters: (lat: number, lon: number, radiusKm?: number) =>
      request(`/v1/emergency/shelters?lat=${lat}&lon=${lon}${radiusKm ? `&radius_km=${radiusKm}` : ''}`),
  },
};
