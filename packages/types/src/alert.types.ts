import { HazardType } from './hazard.types';

export type AlertSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical' | 'emergency';

export interface Alert {
  id: string;
  hazard_type: HazardType;
  hazard_id: string | null;
  severity: AlertSeverity;
  title: string;
  summary: string;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
  source: string;
}

export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  country: string;
  capacity: number | null;
  is_open: boolean;
  disaster_types: string[];
  contact: string | null;
  distance_km?: number;
}
