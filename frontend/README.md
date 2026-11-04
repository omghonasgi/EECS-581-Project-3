# TripTrace Frontend

React + Vite + TypeScript scaffold for Sprint 1.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Dev server runs on http://localhost:5173.

## Layout

- `src/index.tsx` - entry point and routes (`/login`, `/map`, `/experience`).
- `src/components/Login.tsx` - Adam Darst, Arin Shah (Requirement 1).
- `src/components/Map.tsx` - Om Ghonasgi, Axel Bengoa, Jal Maru (Requirements 2, 3).
- `src/components/Experience.tsx` - Jal Maru, Marcos Lepage, Axel Bengoa (Requirements 3, 4, 5, 6).
- `src/assets/geo/` - place the Natural Earth country GeoJSON and the US Census state GeoJSON here.

## Dependencies already installed

- `react`, `react-dom`, `react-router-dom`
- `leaflet`, `react-leaflet`, `@types/leaflet` for the map
- `@turf/boolean-point-in-polygon` for country/state lookup from a click point
- `vite`, `typescript`, `@vitejs/plugin-react` for the build
