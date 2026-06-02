# Careem-Style Mobility Decision Brief

A Vite + React prototype that turns public ride-hailing data into a short decision brief for a Careem-style mobility operations team.

## What It Does

- Loads a Chicago Transportation Network Providers sample CSV.
- Accepts compatible CSV uploads.
- Calculates mobility KPIs, pickup areas, route corridors, pooled-ride conversion, and fare efficiency.
- Produces three takeaways and one recommended action.
- Uses an optional OpenRouter free-model API route for AI-polished wording when `OPENROUTER_API_KEY` is configured.
- Includes local open-source SVG visuals and interactive chart/map controls.

## Data Sources

- Primary dataset: https://data.cityofchicago.org/Transportation/Transportation-Network-Providers-Trips-2023-2024-/n26f-ihde
- Regional reference: https://data.ajman.ae/explore/dataset/taxi-trips/

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
vercel login
vercel deploy --prod
```

The app works without API secrets. Add `OPENROUTER_API_KEY` only if you want the optional AI rewrite route.
