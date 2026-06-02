# Careem-Style Decision Brief Generator

## Prototype

- Local verified URL: `http://127.0.0.1:5191`
- Public deployment status: blocked until Vercel credentials are available locally.
- Deploy command after login: `vercel deploy --prod`

## Public Data Sources

- Primary: [Chicago Transportation Network Providers Trips](https://data.cityofchicago.org/Transportation/Transportation-Network-Providers-Trips-2023-2024-/n26f-ihde)
- Regional reference: [Ajman Taxi Trips](https://data.ajman.ae/explore/dataset/taxi-trips/)

## Screenshots

- Desktop: `mobility-decision-brief-desktop.png`
- Mobile: `mobility-decision-brief-mobile.png`
- Visual style: Mehfooz-inspired dark editorial UI using a Gilroy/Manrope-style font stack.
- Visual assets: local open-source SVG images in `public/assets`.
- Interactions: chart mode switching, hoverable SVG bars, and clickable route signal map.

## 100-Word Summary

This prototype is a Decision Brief Generator for a Careem-style mobility operations team. It uses public ride-hailing trip data to convert operational metrics into an executive brief. The app analyzes demand by hour and area, trip duration, distance, fare efficiency, top pickup/dropoff corridors, pooled-ride rate, and shared-ride match-through. It then generates three takeaways and one recommended action, such as rebalancing drivers or improving pooled matching. Chicago rideshare data provides rich trip-level behavior, while Ajman taxi records add UAE relevance. The demo runs without secrets using deterministic rules, with optional OpenRouter rewriting when an API key is configured, preserving deployment readiness.
