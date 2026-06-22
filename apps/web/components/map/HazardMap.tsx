'use client';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';

const LAYERS = {
  earthquake: { label: 'Earthquakes', emoji: '⚡', default: true  },
  cyclone:    { label: 'Cyclones',    emoji: '🌀', default: true  },
  wildfire:   { label: 'Wildfires',   emoji: '🔥', default: true  },
  volcano:    { label: 'Volcanoes',   emoji: '🌋', default: false },
};

export default function HazardMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [layerState, setLayerState] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(Object.entries(LAYERS).map(([k, v]) => [k, v.default]));
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('hazardwatch:layerState');
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {
      // ignore malformed/missing localStorage data
    }
    return defaults;
  });

  // Persist layer preferences whenever they change (skips the very first render's defaults)
  const layerStateHydrated = useRef(false);
  useEffect(() => {
    if (!layerStateHydrated.current) { layerStateHydrated.current = true; return; }
    try {
      localStorage.setItem('hazardwatch:layerState', JSON.stringify(layerState));
    } catch {
      // ignore storage errors (e.g. quota, privacy mode)
    }
  }, [layerState]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [eqCount, setEqCount] = useState(0);
  const eqDataRef = useRef<any>({ type: 'FeatureCollection', features: [] });
  const wildfireDataRef = useRef<any>({ type: 'FeatureCollection', features: [] });
  const { on, subscribeArea } = useSocket();

  const loadWildfires = useCallback(async (map: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/v1/wildfires?min_confidence=30&limit=500`);
      const data = await res.json();
      const fires = data.wildfires ?? [];

      const features = fires
        .map((f: any) => {
          const lat = parseFloat(f.lat);
          const lon = parseFloat(f.lon);
          if (isNaN(lat) || isNaN(lon)) return null;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: { frp: parseFloat(f.frp) || 0, confidence: f.confidence, brightness: parseFloat(f.brightness_k) || 0 },
          };
        })
        .filter(Boolean);

      const fc = { type: 'FeatureCollection', features };
      wildfireDataRef.current = fc;

      const source = map.getSource('wildfires');
      if (source) source.setData(fc);
    } catch (err) {
      console.error('Failed to load wildfires', err);
    }
  }, []);
  const loadVolcanoes = useCallback(async (map: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/v1/volcano`);
      const data = await res.json();
      const volcanoes = data.data ?? [];

      const features = volcanoes
        .map((v: any) => {
          const lat = parseFloat(v.lat);
          const lon = parseFloat(v.lon);
          if (isNaN(lat) || isNaN(lon)) return null;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: {
              name: v.name,
              country: v.country,
              alert_level: v.alert_level,
              elevation_m: v.elevation_m,
            },
          };
        })
        .filter(Boolean);

      const fc = { type: 'FeatureCollection', features };
      const source = map.getSource('volcanoes');
      if (source) source.setData(fc);
    } catch (err) {
      console.error('Failed to load volcanoes', err);
    }
  }, []);

  const loadEarthquakes = useCallback(async (map: any, mapboxgl: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/v1/earthquakes?hours=24&min_magnitude=2&limit=200`);
      const data = await res.json();
      const earthquakes = data.earthquakes ?? [];

      const features = earthquakes
        .map((eq: any) => {
          const lat = parseFloat(eq.lat);
          const lon = parseFloat(eq.lon);
          if (isNaN(lat) || isNaN(lon)) return null;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: {
              magnitude: parseFloat(eq.magnitude),
              place_name: eq.place_name,
              depth_km: parseFloat(eq.depth_km),
            },
          };
        })
        .filter(Boolean);

      setEqCount(features.length);
      const fc = { type: 'FeatureCollection', features };
      eqDataRef.current = fc;

      const source = map.getSource('earthquakes');
      if (source) source.setData(fc);

      if (features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        features.forEach((f: any) => bounds.extend(f.geometry.coordinates));
        map.fitBounds(bounds, { padding: 80, maxZoom: 4, duration: 0 });
      }
    } catch (err) {
      console.error('Failed to load earthquakes', err);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    let cancelled = false;
    let localMap: any = null;

    void import('mapbox-gl').then(async (mapboxgl) => {
      if (cancelled) return;
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

      const map = new mapboxgl.default.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: { name: 'mercator' },

        center: [100, 15],
        zoom: 2,
      });

      if (cancelled) { map.remove(); return; }
      localMap = map;
      mapRef.current = map;

      map.on('load', async () => {
        map.addSource('earthquakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'eq-circles', type: 'circle', source: 'earthquakes',
          layout: { visibility: 'visible' },
          paint: {
            'circle-radius':       ['interpolate',['linear'],['get','magnitude'], 2,5, 5,12, 7,22, 9,38],
            'circle-color':        ['interpolate',['linear'],['get','magnitude'], 2,'#facc15', 5,'#f97316', 7,'#ef4444'],
            'circle-opacity':       0.8,
            'circle-stroke-width':  1.5,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addSource('wildfires', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'wildfire-heat', type: 'circle', source: 'wildfires',
          layout: { visibility: 'visible' },
          paint: {
            'circle-radius':       ['interpolate',['linear'],['get','frp'], 0,5, 50,10, 200,18, 1000,28],
            'circle-color':        '#FFD60A',
            'circle-opacity':      0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#FF6B00',
            'circle-blur':         0.3,
          },
        });

        map.addSource('cyclone-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'cyclone-track', type: 'line', source: 'cyclone-tracks',
          paint: { 'line-color': '#a78bfa', 'line-width': 2 },
        });
        map.addSource('volcanoes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'volcano-circles', type: 'circle', source: 'volcanoes',
          layout: { visibility: 'visible' },
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'match', ['get', 'alert_level'],
              'warning', '#ef4444',
              'watch', '#f97316',
              'advisory', '#facc15',
              '#22c55e',
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.on('click', 'eq-circles', (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          new mapboxgl.default.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:#000;padding:8px"><strong>M${props.magnitude}</strong><br/>${props.place_name}<br/>${props.depth_km}km deep</div>`)
            .addTo(map);
        });
        map.on('mouseenter', 'eq-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'eq-circles', () => { map.getCanvas().style.cursor = ''; });

        map.on('click', 'wildfire-heat', (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          new mapboxgl.default.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:#000;padding:8px"><strong>🔥 Active Fire</strong><br/>FRP: ${Number(props.frp).toFixed(1)} MW<br/>Confidence: ${props.confidence}%<br/>Brightness: ${Number(props.brightness).toFixed(0)}K</div>`)
            .addTo(map);
        });
        map.on('mouseenter', 'wildfire-heat', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'wildfire-heat', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'volcano-circles', (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          new mapboxgl.default.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:#000;padding:8px"><strong>🌋 ${props.name}</strong><br/>${props.country}<br/>Alert: ${String(props.alert_level).toUpperCase()}<br/>Elevation: ${props.elevation_m ?? '?'}m</div>`)
            .addTo(map);
        });
        map.on('mouseenter', 'volcano-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'volcano-circles', () => { map.getCanvas().style.cursor = ''; });

        await loadEarthquakes(map, mapboxgl.default);
        await loadWildfires(map);
        await loadVolcanoes(map);

        // Apply current (already-restored) layer visibility now that data + layers exist
        if (layerState.earthquake === false) {
          const source = map.getSource?.('earthquakes');
          (source as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        }
        if (layerState.wildfire === false) {
          const source = map.getSource?.('wildfires');
          (source as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        }
        if (layerState.cyclone === false && map.getLayer?.('cyclone-track')) {
          map.setLayoutProperty('cyclone-track', 'visibility', 'none');
        }
        if (layerState.volcano === false && map.getLayer?.('volcano-circles')) {
          map.setLayoutProperty('volcano-circles', 'visibility', 'none');
        }

        setMapLoaded(true);
        subscribeArea(15, 100, 5000, Object.keys(LAYERS));
      });
    });

    const ro = new ResizeObserver(() => { localMap?.resize?.(); });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      localMap?.remove?.();
      if (mapRef.current === localMap) mapRef.current = null;
    };
  }, [subscribeArea, loadEarthquakes, loadWildfires, loadVolcanoes]);

  useEffect(() => {
    on<any>('earthquake:new', (eq) => {
      const m = mapRef.current;
      if (!m) return;
      const source = m.getSource('earthquakes');
      if (!source) return;
      const lat = parseFloat(eq.lat);
      const lon = parseFloat(eq.lon);
      if (isNaN(lat) || isNaN(lon)) return;

      const current = source._data ?? { type: 'FeatureCollection', features: [] };
      const newFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: { magnitude: parseFloat(eq.magnitude), place_name: eq.place_name, depth_km: parseFloat(eq.depth_km) },
      };
      source.setData({ type: 'FeatureCollection', features: [...current.features, newFeature] });
    });
  }, [on]);

  const toggleLayer = useCallback((key: string) => {
    setLayerState(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const m = mapRef.current;
      if (!m) return next;
      const layerMap: Record<string, string[]> = {
        earthquake: ['eq-circles'],
        wildfire:   ['wildfire-heat'],
        cyclone:    ['cyclone-track'],
        volcano:    ['volcano-circles'],
      };
      if (key === 'earthquake') {
        const source = m.getSource?.('earthquakes');
        if (source) {
          source.setData(next.earthquake ? eqDataRef.current : { type: 'FeatureCollection', features: [] });
        }
      } else if (key === 'wildfire') {
        const source = m.getSource?.('wildfires');
        if (source) {
          source.setData(next.wildfire ? wildfireDataRef.current : { type: 'FeatureCollection', features: [] });
        }
      } else {
        layerMap[key]?.forEach((id) => {
          if (m.getLayer?.(id)) {
            m.setLayoutProperty(id, 'visibility', next[key] ? 'visible' : 'none');
          }
        });
      }
      return next;
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <div className="text-gray-400">Loading map...</div>
        </div>
      )}
      {mapLoaded && (
        <div className="absolute top-4 left-4 right-4 sm:right-auto bg-gray-900/90 backdrop-blur rounded-lg px-3 py-2 text-sm text-gray-300 border border-gray-700">
          {eqCount} earthquakes shown (M2.0+, last 24h)
        </div>
      )}
      <div className="absolute top-20 right-4 sm:top-4 bg-gray-900/90 backdrop-blur rounded-xl p-3 flex flex-col gap-1.5 min-w-[160px] border border-gray-700">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1 mb-1">Layers</p>
        {Object.entries(LAYERS).map(([key, { label, emoji }]) => (
          <button key={key} onClick={() => toggleLayer(key)}
            className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
              layerState[key] ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300')}>
            <span>{emoji}</span><span>{label}</span>
            <div className={cn('ml-auto w-2 h-2 rounded-full', layerState[key] ? 'bg-emerald-400' : 'bg-gray-600')} />
          </button>
        ))}
      </div>
    </div>
  );
}
