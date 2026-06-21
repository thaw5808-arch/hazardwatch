export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Earthquake {
  id: string;
  usgs_id: string;
  magnitude: number;
  magnitude_type: string;
  depth_km: number;
  lat: number;
  lon: number;
  place_name: string;
  occurred_at: string;
  status: 'automatic' | 'reviewed' | 'deleted';
  tsunami_risk: boolean;
  alert_level: 'green' | 'yellow' | 'orange' | 'red' | null;
  distance_km?: number;
}

export interface Cyclone {
  id: string;
  storm_id: string;
  name: string;
  basin: string;
  category: number | null;
  storm_type: 'td' | 'ts' | 'hurricane' | 'typhoon' | 'cyclone' | 'supertyphoon';
  is_active: boolean;
  current_center: GeoPoint;
  wind_speed_kts: number | null;
  pressure_mb: number | null;
  last_updated_at: string;
  track?: CycloneTrackPoint[];
}

export interface CycloneTrackPoint {
  location: GeoPoint;
  recorded_at: string;
  wind_speed_kts: number | null;
  is_forecast: boolean;
  forecast_hour: number | null;
}

export interface Wildfire {
  id: string;
  firms_id: string | null;
  name: string | null;
  country: string;
  lat: number;
  lon: number;
  brightness_k: number | null;
  confidence: number | null;
  frp: number | null;
  is_active: boolean;
  first_detected: string;
  last_detected: string;
  distance_km?: number;
}

export interface Volcano {
  id: string;
  gvp_id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  elevation_m: number | null;
  alert_level: 'normal' | 'advisory' | 'watch' | 'warning' | 'erupting';
  last_eruption_at: string | null;
}

export interface FloodZone {
  id: string;
  country: string;
  risk_level: 'watch' | 'warning' | 'emergency';
  affected_pop: number | null;
  river_name: string | null;
  active_since: string;
  expires_at: string | null;
}

export interface TsunamiWarning {
  id: string;
  warning_type: 'information' | 'watch' | 'advisory' | 'warning';
  affected_coasts: string[];
  issue_time: string;
  expires_at: string | null;
  wave_height_m: number | null;
}

export interface AirQualityReading {
  station_id: string;
  station_name: string | null;
  lat: number;
  lon: number;
  recorded_at: string;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  distance_km?: number;
}

export type HazardType =
  | 'earthquake' | 'cyclone' | 'wildfire' | 'flood'
  | 'tsunami' | 'volcano' | 'air_quality' | 'landslide' | 'weather';
