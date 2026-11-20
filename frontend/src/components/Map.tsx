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

import { useState, useEffect, FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../index.css';
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

// Flies the Leaflet map to a Nominatim search result when target changes.
function FlyToSearch({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 12);
    }
  }, [target, map]);
  return null;
}

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
    <div className="experience-photos">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" className="experience-photo-thumb" />
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
  const [searchParams, setSearchParams] = useState<{ q: string }>({ q: '' });
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load markers so they persist after refresh
    const saved = localStorage.getItem('triptrace_experiences');
    if (saved) {
      setExperiences(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const query = searchParams.q.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (!data.length) {
        setSearchError('Location not found');
        setSearchTarget(null);
        return;
      }
      setSearchTarget({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch (error) {
      console.error('Search geocoding failed', error);
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

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
    <div className="map-page">
      <form onSubmit={handleSearch} className="map-search">
        <div className="map-search-field">
          <input
            type="text"
            className="map-search-input"
            value={searchParams.q}
            onChange={(e) => setSearchParams({ q: e.target.value })}
            placeholder="Search For a Location..."
            aria-label="Search location"
          />
        </div>
        <button
          type="submit"
          className="map-search-submit"
          disabled={isSearching}
          aria-label="Search"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
            <path d="M20 20l-3.5-3.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {searchError && <span className="map-search-error">{searchError}</span>}
      </form>

      <div className="map-add-panel">
        <button
          className={`map-add-button${isAdding ? ' is-adding' : ''}`}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel Add' : 'Add Experience'}
        </button>
        {isAdding && <p className="map-add-hint">Click anywhere on the map</p>}
      </div>
      
      <MapContainer
        center={[38.95764, -95.25418]}
        zoom={4}
        className="map-container"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="topright" />
        <MapInteraction isAdding={isAdding} onLocationSelect={handleMapClick} />
        <FlyToSearch target={searchTarget} />
        
        {experiences.map((exp, idx) => (
          <Marker key={idx} position={[exp.lat, exp.lng]}>
            {/* Show saved title, rating, and notes when a marker is clicked */}
            {/* minWidth leaves room for 3 thumbnails per row, since photos load after the popup is sized */}
            <Popup minWidth={exp.photos?.length ? 220 : undefined}>
              <strong>{exp.title}</strong>
              <div className="experience-rating">
                {exp.rating ? '★'.repeat(exp.rating) + '☆'.repeat(5 - exp.rating) : 'Not rated'}
              </div>
              {exp.notes && <p className="experience-notes">{exp.notes}</p>}
              {exp.photos?.length > 0 && <ExperiencePhotos experienceId={exp.id} />}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
