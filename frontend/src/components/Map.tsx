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
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { getPhotos } from '../photoStore';

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

// Loads an experience's saved photos from IndexedDB and shows them as thumbnails.
// Popup content only mounts while the popup is open, so photos load on demand.
function ExperiencePhotos({ experienceId }: { experienceId: number }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let created: string[] = [];
    let cancelled = false;
    getPhotos(experienceId)
      .then((photos) => {
        created = photos.map((photo) => URL.createObjectURL(photo.blob));
        if (cancelled) {
          created.forEach((url) => URL.revokeObjectURL(url));
        } else {
          setUrls(created);
        }
      })
      .catch((error) => console.error('Loading photos failed', error));
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [experienceId]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
        </a>
      ))}
    </div>
  );
}

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
          <Marker key={idx} position={[exp.lat, exp.lng]}>
            {/* Show saved title, rating, and notes when a marker is clicked */}
            {/* minWidth leaves room for 3 thumbnails per row, since photos load after the popup is sized */}
            <Popup minWidth={exp.photos?.length ? 220 : undefined}>
              <strong>{exp.title}</strong>
              <div style={{ color: '#f59e0b', fontSize: '1.1rem' }}>
                {exp.rating ? '★'.repeat(exp.rating) + '☆'.repeat(5 - exp.rating) : 'Not rated'}
              </div>
              {exp.notes && <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0 0' }}>{exp.notes}</p>}
              {exp.photos?.length > 0 && <ExperiencePhotos experienceId={exp.id} />}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
