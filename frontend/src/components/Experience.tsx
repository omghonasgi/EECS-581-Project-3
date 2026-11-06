// Experience.tsx
//
// Owners:
//   Jal Maru      - The Add Experience form opens prefilled with the clicked
//                   point, country, and state. Title is required (validation
//                   error if missing). A valid save creates the marker on the
//                   map, and the marker is still there after refresh.
//   Marcos Lepage - Photo upload: one or more JPEG/PNG files up to 10 MB each,
//                   reject other types or oversized files with an error, store
//                   each photo tied to the experience, and show saved photos
//                   as thumbnails.
//   Axel Bengoa   - 5-star rating control (1-5), server rejects anything
//                   outside 1-5, saved rating shows on the experience.
//                   Notes field up to 2,000 characters with a live character
//                   count; saved notes render with line breaks preserved.
//
// Leave this component empty for now so each developer can fill in their part.

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Experience() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Destructure prefilled data passed from Map.tsx
  const { lat, lng, country, state } = location.state || { lat: null, lng: null, country: '', state: '' };

  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation error if missing title
    if (!title.trim()) {
      setError('Title is required to save this experience.');
      return;
    }

    const newExperience = {
      id: Date.now(),
      title,
      lat,
      lng,
      country,
      state,
      // Stubs for other team members' data
      photos: [],
      rating: null,
      notes: ''
    };

    // Save to local storage to satisfy the refresh persistence requirement
    const existingData = localStorage.getItem('triptrace_experiences');
    const experiences = existingData ? JSON.parse(existingData) : [];
    localStorage.setItem('triptrace_experiences', JSON.stringify([...experiences, newExperience]));

    // Navigate back to the map view
    navigate('/map');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#123047', marginTop: 0 }}>Add New Experience</h2>
      
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px', color: '#475569', fontSize: '0.9rem' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}><strong>Coordinates:</strong> {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Not selected'}</p>
        <p style={{ margin: '0 0 0.5rem 0' }}><strong>Country:</strong> {country || 'N/A'}</p>
        <p style={{ margin: 0 }}><strong>State/Region:</strong> {state || 'N/A'}</p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Title *</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }} 
            style={{ width: '100%', padding: '0.85rem', border: `1px solid ${error ? '#991b1b' : '#cbd5e1'}`, borderRadius: '6px', fontSize: '1rem' }}
            placeholder="e.g., Summer in Tokyo"
          />
          {error && <p style={{ color: '#991b1b', margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 'bold' }}>{error}</p>}
        </div>

        {/* Marcos Lepage - Photo Upload Scope */}
        <div style={{ padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}> 
          <p style={{ margin: 0 }}>[Marcos: Attach JPEG/PNG Upload Component Here]</p>
        </div>

        {/* Axel Bengoa - Ratings and Notes Scope */}
        <div style={{ padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>[Axel: Attach 5-Star Rating & Notes Component Here]</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" style={{ flex: 1, padding: '0.9rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Save Experience
          </button>
          <button type="button" onClick={() => navigate('/map')} style={{ flex: 1, padding: '0.9rem', background: 'transparent', color: '#0f766e', border: '2px solid #0f766e', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
