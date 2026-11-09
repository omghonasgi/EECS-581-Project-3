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

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { savePhotos } from '../photoStore';

const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

export default function Experience() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Destructure prefilled data passed from Map.tsx
  const { lat, lng, country, state } = location.state || { lat: null, lng: null, country: '', state: '' };

  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0); // 0 = not rated yet
  const [notes, setNotes] = useState('');
  const MAX_NOTES = 2000;
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);

  // Thumbnail URLs for the selected photos, released when the selection changes
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Clear the input so the same file can be picked again after removing it
    e.target.value = '';

    const accepted: File[] = [];
    const rejected: string[] = [];
    files.forEach((file) => {
      if (!PHOTO_TYPES.includes(file.type)) {
        rejected.push(`${file.name} is not a JPEG or PNG`);
      } else if (file.size > MAX_PHOTO_BYTES) {
        rejected.push(`${file.name} is larger than 10 MB`);
      } else {
        accepted.push(file);
      }
    });

    setPhotos([...photos, ...accepted]);
    setPhotoError(rejected.length ? `Rejected: ${rejected.join('; ')}.` : '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation error if missing title
    if (!title.trim()) {
      setError('Title is required to save this experience.');
      return;
    }

    // Reject any rating outside 1-5 (0 means the user left it unrated)
    if (rating !== 0 && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      setError('Rating must be between 1 and 5 stars.');
      return;
    }

    if (notes.length > MAX_NOTES) {
      setError(`Notes cannot be longer than ${MAX_NOTES} characters.`);
      return;
    }

    const id = Date.now();

    // Store each photo tied to this experience before saving the experience
    let photoIds: number[] = [];
    setSaving(true);
    try {
      photoIds = await savePhotos(id, photos);
    } catch (err) {
      console.error('Saving photos failed', err);
      setPhotoError('Could not save photos. Please try again.');
      setSaving(false);
      return;
    }

    const newExperience = {
      id,
      title,
      lat,
      lng,
      country,
      state,
      photos: photoIds,
      rating: rating || null,
      notes
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
        <div>
          <label htmlFor="photos" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Photos</label>
          <label htmlFor="photos" style={{ display: 'block', padding: '1.25rem', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b', cursor: 'pointer' }}>
            Choose photos (JPEG or PNG, up to 10 MB each)
          </label>
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
          {photoError && <p style={{ color: '#991b1b', margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 'bold' }}>{photoError}</p>}

          {previews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              {previews.map((url, idx) => (
                <div key={url} style={{ position: 'relative' }}>
                  <img src={url} alt={photos[idx].name} style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${photos[idx].name}`}
                    style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'rgba(15, 23, 42, 0.7)', color: 'white', cursor: 'pointer', lineHeight: '22px', padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Axel Bengoa - Ratings and Notes Scope */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Rating</label>
          <div>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', padding: '0 0.15rem', color: star <= rating ? '#f59e0b' : '#cbd5e1' }}
              >
                ★
              </button>
            ))}
            <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
              {rating ? `${rating} / 5` : 'Not rated'}
            </span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={MAX_NOTES}
            rows={6}
            placeholder="What did you do there?"
            style={{ width: '100%', padding: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <p style={{ margin: '0.25rem 0 0', textAlign: 'right', fontSize: '0.85rem', color: notes.length >= MAX_NOTES ? '#991b1b' : '#64748b' }}>
            {notes.length} / {MAX_NOTES}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.9rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '1rem', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Experience'}
          </button>
          <button type="button" onClick={() => navigate('/map')} style={{ flex: 1, padding: '0.9rem', background: 'transparent', color: '#0f766e', border: '2px solid #0f766e', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
