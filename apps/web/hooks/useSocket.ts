'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(`${process.env.NEXT_PUBLIC_API_URL}/hazards`, {
        transports: ['websocket'],
        withCredentials: true,
      });
    }
    ref.current = socket;
  }, []);

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    ref.current?.on(event, handler as (data: unknown) => void);
    return () => ref.current?.off(event, handler as (data: unknown) => void);
  }, []);

  const subscribeArea = useCallback((lat: number, lon: number, radiusKm: number, layers: string[]) => {
    ref.current?.emit('subscribe_area', { lat, lon, radius_km: radiusKm, layers });
  }, []);

  return { on, subscribeArea };
}
