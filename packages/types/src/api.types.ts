import { Earthquake, Cyclone, Wildfire, AirQualityReading } from './hazard.types';
import { Alert } from './alert.types';

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

export interface EarthquakeListResponse {
  total: number;
  earthquakes: Earthquake[];
}

export interface CycloneListResponse {
  cyclones: Cyclone[];
}

export interface WildfireListResponse {
  total: number;
  wildfires: Wildfire[];
}

export interface AlertListResponse {
  total: number;
  alerts: Alert[];
}

export interface AssistantQuery {
  query: string;
  lat?: number;
  lon?: number;
  context_radius_km?: number;
}

export type RiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'critical';

export interface AssistantResponse {
  risk_level: RiskLevel;
  summary: string;
  hazards_considered: Record<string, { status: string; detail?: string; aqi?: number }>;
  recommendations: string[];
  data_confidence: 'high' | 'medium' | 'low';
  generated_at: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  version: string;
}
