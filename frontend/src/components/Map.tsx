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

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons not loading correctly in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapInteraction({ isAdding, onLocationSelect }: { isAdding: boolean, onLocationSelect: (latlng: any) => void }) {
  useMapEvents({
    click(e) {
      if (isAdding) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
}

export default function Map() {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load markers so they persist after refresh
    const saved = localStorage.getItem('triptrace_experiences');
    if (saved) {
      setExperiences(JSON.parse(saved));
    }
  }, []);

  const handleMapClick = async (latlng: any) => {
    let country = '';
    let state = '';
    
    try {
      // Reverse geocode to capture country and state
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await res.json();
      country = data.address?.country || '';
      state = data.address?.state || data.address?.region || '';
    } catch (error) {
      console.error("Geocoding failed", error);
    }

    // Pass captured data to the Experience route
    navigate('/experience', {
      state: { lat: latlng.lat, lng: latlng.lng, country, state }
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          style={{ padding: '0.75rem 1rem', background: isAdding ? '#991b1b' : '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isAdding ? 'Cancel Add' : 'Add Experience'}
        </button>
        {isAdding && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#334155' }}>Click anywhere on the map</p>}
      </div>
      
      <MapContainer center={[38.95764, -95.25418]} zoom={4} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapInteraction isAdding={isAdding} onLocationSelect={handleMapClick} />
        
        {experiences.map((exp, idx) => (
          <Marker key={idx} position={[exp.lat, exp.lng]} />
        ))}
      </MapContainer>
    </div>
  );
}
