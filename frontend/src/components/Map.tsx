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

import { useState, useEffect, useRef, FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../index.css';
import { useAuth } from '../lib/AuthProvider';
import { listExperiences, type Experience } from '../lib/experiences';
import ExperienceDetails from './ExperienceDetails';

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

type SearchSuggestion =
  | {
      kind: 'experience';
      id: number;
      label: string;
      detail: string;
      lat: number;
      lng: number;
    }
  | {
      kind: 'place';
      place_id: number;
      label: string;
      lat: string;
      lon: string;
    };

// Flies the Leaflet map to a search result when target changes.
function FlyToSearch({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 12);
    }
  }, [target, map]);
  return null;
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
  const [experiences, setExperiences] = useState<Experience[]>([]);
  // Rating filter (Om builds the UI, Axel wires it to the query): null = all
  const [minRating, setMinRating] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchParams, setSearchParams] = useState<{ q: string }>({ q: '' });
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Load the signed-in user's experiences from Supabase (RLS = own rows).
    // Re-runs when the user or rating filter changes, and on every visit to
    // /map, so saves and edits show up as soon as the form navigates back.
    if (!user) return;
    let cancelled = false;
    setLoadError('');
    listExperiences({ minRating })
      .then((rows) => {
        if (!cancelled) setExperiences(rows);
      })
      .catch((error) => {
        console.error('Loading experiences failed', error);
        if (!cancelled) setLoadError('Could not load your experiences.');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, minRating]);

  // Close the details panel if the selected experience is filtered out
  useEffect(() => {
    if (selectedId !== null && !experiences.some((exp) => exp.id === selectedId)) setSelectedId(null);
  }, [experiences, selectedId]);

  const selectedExperience = experiences.find((exp) => exp.id === selectedId);

  // Match saved experiences by title, country, or state (local, no network).
  function matchingExperiences(query: string): SearchSuggestion[] {
    const q = query.toLowerCase();
    return experiences
      .filter((exp) => {
        const title = String(exp.title ?? '').toLowerCase();
        const country = String(exp.country ?? '').toLowerCase();
        const state = String(exp.state ?? '').toLowerCase();
        return title.includes(q) || country.includes(q) || state.includes(q);
      })
      .slice(0, 5)
      .map((exp) => {
        const where = [exp.state, exp.country].filter(Boolean).join(', ');
        return {
          kind: 'experience' as const,
          id: exp.id,
          label: exp.title || 'Untitled experience',
          detail: where || `${Number(exp.lat).toFixed(2)}, ${Number(exp.lng).toFixed(2)}`,
          lat: exp.lat,
          lng: exp.lng,
        };
      });
  }

  // Debounced suggestions: user's experiences first, then Nominatim places.
  useEffect(() => {
    const query = searchParams.q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const experienceHits = matchingExperiences(query);
      let placeHits: SearchSuggestion[] = [];

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
          { headers: { Accept: 'application/json' } }
        );
        const data = await res.json();
        placeHits = data.map((place: { place_id: number; display_name: string; lat: string; lon: string }) => ({
          kind: 'place' as const,
          place_id: place.place_id,
          label: place.display_name,
          lat: place.lat,
          lon: place.lon,
        }));
      } catch (error) {
        console.error('Suggestion search failed', error);
      }

      setSuggestions([...experienceHits, ...placeHits]);
      setShowSuggestions(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchParams.q, experiences]);

  // Close the suggestion list when clicking outside the search UI.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const goToSuggestion = (item: SearchSuggestion) => {
    if (item.kind === 'experience') {
      setSearchTarget({ lat: item.lat, lng: item.lng, zoom: 14 });
      setSelectedId(item.id);
      setSearchParams({ q: item.label });
    } else {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      setSearchTarget({ lat, lng, zoom: 12 });
      setSearchParams({ q: item.label });
    }
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchError('');
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const query = searchParams.q.trim();
    if (!query) return;

    // Prefer the first open suggestion if the user hits Enter / the search button.
    if (suggestions.length > 0) {
      goToSuggestion(suggestions[0]);
      return;
    }

    // No open list: try experiences first, then Nominatim.
    const experienceHits = matchingExperiences(query);
    if (experienceHits.length > 0) {
      goToSuggestion(experienceHits[0]);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (!data.length) {
        setSearchError('No experiences or locations found');
        setSearchTarget(null);
        return;
      }
      goToSuggestion({
        kind: 'place',
        place_id: data[0].place_id,
        label: data[0].display_name,
        lat: data[0].lat,
        lon: data[0].lon,
      });
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
        <div className="map-search-wrap" ref={searchWrapRef}>
          <div className="map-search-field">
            <input
              type="text"
              className="map-search-input"
              value={searchParams.q}
              onChange={(e) => {
                setSearchParams({ q: e.target.value });
                setSearchError('');
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Search experiences or places..."
              aria-label="Search experiences or places"
              aria-autocomplete="list"
              autoComplete="off"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="map-search-suggestions" role="listbox">
              {suggestions.some((s) => s.kind === 'experience') && (
                <li className="map-search-group-label" aria-hidden="true">Your experiences</li>
              )}
              {suggestions.filter((s) => s.kind === 'experience').map((item) => (
                <li key={`exp-${item.id}`} role="option">
                  <button
                    type="button"
                    className="map-search-suggestion"
                    onClick={() => goToSuggestion(item)}
                  >
                    <span className="map-search-suggestion-title">{item.label}</span>
                    <span className="map-search-suggestion-detail">{item.detail}</span>
                  </button>
                </li>
              ))}
              {suggestions.some((s) => s.kind === 'place') && (
                <li className="map-search-group-label" aria-hidden="true">Places</li>
              )}
              {suggestions.filter((s) => s.kind === 'place').map((item) => (
                <li key={`place-${item.place_id}`} role="option">
                  <button
                    type="button"
                    className="map-search-suggestion"
                    onClick={() => goToSuggestion(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
        {/* Rating filter: placeholder control for Om's Filter UI; keep the
            minRating state wiring when restyling. */}
        <label className="map-filter">
          <span>Rating</span>
          <select
            value={minRating ?? ''}
            onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filter experiences by minimum rating"
          >
            <option value="">All</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n === 5 ? '5 stars' : `${n}+ stars`}</option>
            ))}
          </select>
        </label>
        {loadError && <p className="map-add-hint" style={{ color: '#b91c1c' }}>{loadError}</p>}
        {deleteNotice && <p className="map-add-hint" role="status" style={{ color: '#b45309' }}>{deleteNotice}</p>}
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
        
        {experiences.map((exp) => (
          <Marker
            key={exp.id}
            position={[exp.lat, exp.lng]}
            eventHandlers={{ click: () => setSelectedId(exp.id) }}
          >
            {/* Title on hover so markers can be told apart before opening details */}
            <Tooltip direction="top" offset={[0, -36]}>{exp.title}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {selectedExperience && (
        <ExperienceDetails
          experience={selectedExperience}
          onClose={() => setSelectedId(null)}
          onDelete={(deletedId, cleanupWarning) => {
            setExperiences((current) => current.filter((experience) => experience.id !== deletedId));
            setSelectedId(null);
            setDeleteNotice(cleanupWarning ?? '');
          }}
        />
      )}
    </div>
  );
}
