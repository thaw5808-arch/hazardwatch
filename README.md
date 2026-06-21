# HazardWatch 🌍

Real-time weather forecasting and multi-disaster monitoring platform.

## Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Mapbox GL JS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL 16 + PostGIS
- **Cache / Pub-Sub**: Redis 7
- **Auth**: Clerk
- **AI**: Claude API (Anthropic)
- **Deployment**: Docker, AWS ECS, Vercel, GitHub Actions

## Quick Start

### 1. Clone and install
```bash
git clone https://github.com/yourusername/hazardwatch
cd hazardwatch
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in all required API keys (see .env.example for the full list)
```

### 3. Start local services
```bash
docker compose up -d postgres redis
# Wait ~10 seconds for PostGIS to initialise
```

### 4. Start development servers
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# API docs: http://localhost:3001/docs
```

## Project Structure
```
hazardwatch/
├── apps/
│   ├── web/        Next.js frontend
│   └── api/        NestJS backend
├── packages/
│   └── types/      Shared TypeScript types
├── infra/
│   ├── docker/     Dockerfiles + SQL init
│   ├── aws/        ECS task definitions
│   └── monitoring/ Prometheus config
└── .github/
    └── workflows/  CI/CD pipelines
```

## API Endpoints
See http://localhost:3001/docs for interactive Swagger docs.

| Endpoint | Description |
|---|---|
| GET /v1/health | Health check |
| GET /v1/weather/current | Current weather by lat/lon |
| GET /v1/weather/forecast | 7-day + hourly forecast |
| GET /v1/earthquakes | Recent earthquakes (filterable) |
| GET /v1/cyclones/active | Active tropical systems |
| GET /v1/wildfires | Active fire hotspots |
| GET /v1/air-quality/current | Nearest AQI reading |
| GET /v1/alerts | Active hazard alerts |
| POST /v1/assistant/query | AI safety assistant (auth required) |
| GET /v1/emergency/shelters | Nearby shelters |
| POST /v1/emergency/sos | Trigger SOS (auth required) |

## External API Keys Required
- [OpenWeather](https://openweathermap.org/api) — weather data
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/) — wildfire hotspots
- [OpenAQ](https://openaq.org/) — air quality
- [Anthropic](https://console.anthropic.com/) — AI assistant
- [Mapbox](https://account.mapbox.com/) — map tiles
- [Clerk](https://clerk.com/) — authentication
- [Resend](https://resend.com/) — email notifications

## Deployment
Push a tag to trigger production deployment:
```bash
git tag v1.0.0 && git push origin v1.0.0
```

Requires GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
