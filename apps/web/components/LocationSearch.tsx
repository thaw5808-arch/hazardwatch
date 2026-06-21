'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface GeoResult {
  name: string;
  country: string;
  state: string | null;
  lat: number;
  lon: number;
}

interface Props {
  onSelect: (lat: number, lon: number, label: string) => void;
  currentLabel?: string;
}

export default function LocationSearch({ onSelect, currentLabel }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const api = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${api}/v1/weather/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json() as GeoResult[];
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
  };

  const handleSelect = (r: GeoResult) => {
    const label = r.state ? `${r.name}, ${r.state}, ${r.country}` : `${r.name}, ${r.country}`;
    onSelect(r.lat, r.lon, label);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-64">
      <div className="flex items-center gap-2 bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={currentLabel ?? 'Search city...'}
          className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
        />
        {query && (
          <button onClick={handleClear}>
            <X className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
          </button>
        )}
        {loading && (
          <div className="w-3.5 h-3.5 border border-gray-500 border-t-white rounded-full animate-spin shrink-0" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-sm text-white">{r.name}</span>
              <span className="text-xs text-gray-500 ml-auto shrink-0">
                {r.state ? `${r.state}, ` : ''}{r.country}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.trim() && (
        <div className="absolute top-full mt-1 w-full bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 z-50">
          <span className="text-sm text-gray-500">No cities found</span>
        </div>
      )}
    </div>
  );
}