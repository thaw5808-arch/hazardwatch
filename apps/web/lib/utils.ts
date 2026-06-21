import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(level: string): string {
  const map: Record<string, string> = {
    safe:      'text-green-400 bg-green-400/10 border-green-400/30',
    low:       'text-lime-400 bg-lime-400/10 border-lime-400/30',
    moderate:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    high:      'text-orange-400 bg-orange-400/10 border-orange-400/30',
    critical:  'text-red-400 bg-red-400/10 border-red-400/30',
    emergency: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  };
  return map[level] ?? map['low'];
}

export function getMagnitudeColor(mag: number): string {
  if (mag >= 7) return 'text-red-400';
  if (mag >= 6) return 'text-orange-400';
  if (mag >= 5) return 'text-yellow-400';
  return 'text-gray-400';
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
