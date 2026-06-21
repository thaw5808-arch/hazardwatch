-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  role         TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('public','responder','agency','admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  home_location        GEOGRAPHY(POINT, 4326),
  home_location_name   TEXT,
  alert_radius_km      INT NOT NULL DEFAULT 200,
  disaster_types       TEXT[] NOT NULL DEFAULT ARRAY['earthquake','cyclone','wildfire','flood','tsunami'],
  min_earthquake_mag   NUMERIC(3,1) NOT NULL DEFAULT 4.5,
  notification_push    BOOLEAN NOT NULL DEFAULT TRUE,
  notification_sms     BOOLEAN NOT NULL DEFAULT FALSE,
  notification_email   BOOLEAN NOT NULL DEFAULT TRUE,
  phone_number         TEXT,
  language             TEXT NOT NULL DEFAULT 'en',
  unit_system          TEXT NOT NULL DEFAULT 'metric',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── emergency_contacts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  relation   TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── earthquakes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earthquakes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usgs_id         TEXT UNIQUE NOT NULL,
  magnitude       NUMERIC(4,2) NOT NULL,
  magnitude_type  TEXT NOT NULL DEFAULT 'mw',
  depth_km        NUMERIC(8,3) NOT NULL,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  place_name      TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'automatic',
  tsunami_risk    BOOLEAN NOT NULL DEFAULT FALSE,
  alert_level     TEXT CHECK (alert_level IN ('green','yellow','orange','red')),
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_earthquakes_location  ON earthquakes USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_earthquakes_occurred  ON earthquakes (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_earthquakes_magnitude ON earthquakes (magnitude DESC);

-- ── cyclones ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cyclones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_id        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  basin           TEXT NOT NULL,
  category        INT,
  storm_type      TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  current_center  GEOGRAPHY(POINT, 4326) NOT NULL,
  wind_speed_kts  INT,
  pressure_mb     INT,
  first_seen_at   TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cyclones_active ON cyclones (last_updated_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cyclones_center ON cyclones USING GIST (current_center);

-- ── cyclone_track_points ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cyclone_track_points (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cyclone_id     UUID NOT NULL REFERENCES cyclones(id) ON DELETE CASCADE,
  location       GEOGRAPHY(POINT, 4326) NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL,
  wind_speed_kts INT,
  pressure_mb    INT,
  storm_type     TEXT,
  is_forecast    BOOLEAN NOT NULL DEFAULT FALSE,
  forecast_hour  INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_track_cyclone  ON cyclone_track_points (cyclone_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_track_location ON cyclone_track_points USING GIST (location);

-- ── volcanoes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volcanoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gvp_id           TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  country          TEXT NOT NULL,
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  elevation_m      INT,
  alert_level      TEXT NOT NULL DEFAULT 'normal',
  last_eruption_at TIMESTAMPTZ,
  is_monitored     BOOLEAN NOT NULL DEFAULT TRUE,
  raw_data         JSONB,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_volcanoes_location ON volcanoes USING GIST (location);

-- ── volcano_events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volcano_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volcano_id  UUID NOT NULL REFERENCES volcanoes(id),
  event_type  TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'low',
  description TEXT,
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  raw_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── wildfires ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wildfires (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firms_id       TEXT UNIQUE,
  name           TEXT,
  country        TEXT NOT NULL,
  location       GEOGRAPHY(POINT, 4326) NOT NULL,
  brightness_k   NUMERIC(7,2),
  confidence     INT,
  frp            NUMERIC(10,2),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  first_detected TIMESTAMPTZ NOT NULL,
  last_detected  TIMESTAMPTZ NOT NULL,
  raw_data       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wildfires_location ON wildfires USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_wildfires_active   ON wildfires (last_detected DESC) WHERE is_active = TRUE;

-- ── flood_zones ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flood_zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL DEFAULT 'gdacs',
  country      TEXT NOT NULL,
  area         GEOGRAPHY(POLYGON, 4326) NOT NULL,
  risk_level   TEXT NOT NULL CHECK (risk_level IN ('watch','warning','emergency')),
  affected_pop BIGINT,
  river_name   TEXT,
  active_since TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ,
  raw_data     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flood_zones_area ON flood_zones USING GIST (area);

-- ── tsunami_warnings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tsunami_warnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  noaa_id         TEXT UNIQUE,
  source_event    UUID REFERENCES earthquakes(id),
  warning_type    TEXT NOT NULL,
  affected_coasts TEXT[],
  issue_time      TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ,
  wave_height_m   NUMERIC(6,2),
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── air_quality_readings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS air_quality_readings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id   TEXT NOT NULL,
  station_name TEXT,
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL,
  aqi          INT,
  pm25         NUMERIC(8,2),
  pm10         NUMERIC(8,2),
  o3           NUMERIC(8,2),
  no2          NUMERIC(8,2),
  so2          NUMERIC(8,2),
  co           NUMERIC(8,2),
  source       TEXT NOT NULL DEFAULT 'openaq',
  raw_data     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aq_location     ON air_quality_readings USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_aq_station_time ON air_quality_readings (station_id, recorded_at DESC);

-- ── weather_readings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_readings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location       GEOGRAPHY(POINT, 4326) NOT NULL,
  location_name  TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'openweather',
  recorded_at    TIMESTAMPTZ NOT NULL,
  temp_c         NUMERIC(6,2),
  feels_like_c   NUMERIC(6,2),
  humidity_pct   INT,
  pressure_hpa   INT,
  wind_speed_ms  NUMERIC(6,2),
  wind_dir_deg   INT,
  visibility_m   INT,
  weather_code   INT,
  weather_desc   TEXT,
  raw_data       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_readings USING GIST (location);

-- ── alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_type   TEXT NOT NULL,
  hazard_id     UUID,
  severity      TEXT NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  affected_area GEOGRAPHY(POLYGON, 4326),
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  source        TEXT NOT NULL,
  raw_data      JSONB
);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (issued_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_area   ON alerts USING GIST (affected_area);

-- ── user_alert_deliveries ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_alert_deliveries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id   UUID NOT NULL REFERENCES alerts(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  channel    TEXT NOT NULL CHECK (channel IN ('push','sms','email','in_app')),
  status     TEXT NOT NULL DEFAULT 'pending',
  sent_at    TIMESTAMPTZ,
  read_at    TIMESTAMPTZ,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_dedup ON user_alert_deliveries (alert_id, user_id, channel);

-- ── ai_conversations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  session_id TEXT NOT NULL,
  query      TEXT NOT NULL,
  location   GEOGRAPHY(POINT, 4326),
  context    JSONB NOT NULL DEFAULT '{}',
  response   TEXT NOT NULL,
  risk_level TEXT,
  tokens_in  INT,
  tokens_out INT,
  model      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_conversations (user_id, created_at DESC);

-- ── shelters ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  location       GEOGRAPHY(POINT, 4326) NOT NULL,
  address        TEXT NOT NULL,
  country        TEXT NOT NULL,
  capacity       INT,
  is_open        BOOLEAN NOT NULL DEFAULT TRUE,
  disaster_types TEXT[] NOT NULL DEFAULT ARRAY['all'],
  contact        TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_shelters_open     ON shelters (is_open) WHERE is_open = TRUE;
