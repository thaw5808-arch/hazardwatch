'use client';
import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); },
      (err) => setError(err.message),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  return { lat, lon, error };
}
