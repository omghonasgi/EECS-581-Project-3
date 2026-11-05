// Map.tsx
//
// Owners:
//   Om Ghonasgi - After login, render a world map with country borders using
//                 Leaflet + React-Leaflet + OpenStreetMap tiles. Pan by
//                 dragging, zoom with the scroll wheel and the on-screen
//                 +/- buttons.
//   Jal Maru    - Add the "click the map to place an experience" flow:
//                 capture lat/lng + country + state and open Experience.tsx
//                 prefilled with that point. Render saved experience markers.
//
// Leave this component empty for now so each developer can fill in their part.

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map() {
  return (
    <div>
      <h1>Map</h1>
      <MapContainer center={[38.95764, -95.25418]} zoom={10} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
}
