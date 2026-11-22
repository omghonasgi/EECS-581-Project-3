// ExperienceDetails.tsx
//
// Owner: Marcos Lepage - Requirement 7 (view experience details).
//   Selecting a marker opens this side panel with the experience's photos,
//   rating, and notes. Clicking a photo opens it full size, with previous /
//   next controls and Escape to close.
//
// Edit (Req 8) and delete (Req 9) actions belong in the
// .experience-details-actions area at the bottom of the panel.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhotos } from '../photoStore';

type ExperienceDetailsProps = {
  experience: any;
  onClose: () => void;
};

// Loads the experience's saved photos (Storage URLs or local IndexedDB blobs).
function usePhotoUrls(experience: any) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If photos are already Storage URL strings, use them directly.
    if (Array.isArray(experience.photos) && typeof experience.photos[0] === 'string') {
      setUrls(experience.photos);
      setLoading(false);
      return;
    }

    let created: string[] = [];
    let cancelled = false;
    setUrls([]);
    setLoading(true);
    getPhotos(experience.id)
      .then((photos) => {
        const visible = Array.isArray(experience.photos)
          ? photos.filter((photo: any) => photo.id === undefined || experience.photos.includes(photo.id))
          : photos;
        created = visible.map((photo: any) => URL.createObjectURL(photo.blob));
        if (cancelled) {
          created.forEach((url) => URL.revokeObjectURL(url));
        } else {
          setUrls(created);
        }
      })
      .catch((error) => console.error('Loading photos failed', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [experience.id, experience.photos]);

  return { urls, loading };
}

export default function ExperienceDetails({ experience, onClose }: ExperienceDetailsProps) {
  const navigate = useNavigate();
  const { urls, loading } = usePhotoUrls(experience);
  const [viewing, setViewing] = useState<number | null>(null); // index of the full-size photo

  // Reset the viewer when a different experience is selected
  useEffect(() => setViewing(null), [experience.id]);

  // Escape closes the photo viewer first, then the panel; arrows step through photos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewing !== null) setViewing(null);
        else onClose();
      } else if (viewing !== null && urls.length > 1) {
        if (e.key === 'ArrowRight') setViewing((viewing + 1) % urls.length);
        if (e.key === 'ArrowLeft') setViewing((viewing - 1 + urls.length) % urls.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing, urls.length, onClose]);

  const where = [experience.state, experience.country].filter(Boolean).join(', ');
  const rating = experience.rating || 0;

  return (
    <>
      <aside className="experience-details" aria-label={`Details for ${experience.title}`}>
        <div className="experience-details-header">
          <div>
            <h2 className="experience-details-title">{experience.title}</h2>
            {where && <p className="experience-details-where">{where}</p>}
          </div>
          <button type="button" className="experience-details-close" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </div>

        <section className="experience-details-section">
          <h3>Rating</h3>
          <div className="experience-rating" aria-label={rating ? `${rating} out of 5 stars` : 'Not rated'}>
            {rating ? (
              <>
                {'★'.repeat(rating)}
                <span className="experience-rating-empty">{'★'.repeat(5 - rating)}</span>
                <span className="experience-rating-label">{rating} / 5</span>
              </>
            ) : (
              <span className="experience-details-muted">Not rated</span>
            )}
          </div>
        </section>

        <section className="experience-details-section">
          <h3>Notes</h3>
          {experience.notes
            ? <p className="experience-notes">{experience.notes}</p>
            : <p className="experience-details-muted">No notes</p>}
        </section>

        <section className="experience-details-section">
          <h3>Photos{urls.length > 0 && ` (${urls.length})`}</h3>
          {loading && experience.photos?.length > 0 && <p className="experience-details-muted">Loading photos…</p>}
          {!loading && urls.length === 0 && <p className="experience-details-muted">No photos</p>}
          {urls.length > 0 && (
            <div className="experience-details-photos">
              {urls.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  className="experience-details-photo"
                  onClick={() => setViewing(idx)}
                  aria-label={`View photo ${idx + 1} of ${urls.length}`}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="experience-details-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/experience', { state: { experience } })}
          >
            Edit
          </button>
          {/* Req 9 (delete) button goes here */}
        </div>
      </aside>

      {viewing !== null && urls[viewing] && (
        <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setViewing(null)}>
          <img src={urls[viewing]} alt={`Photo ${viewing + 1} of ${urls.length}`} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="photo-viewer-close" onClick={() => setViewing(null)} aria-label="Close photo">
            ×
          </button>
          {urls.length > 1 && (
            <>
              <button
                type="button"
                className="photo-viewer-nav photo-viewer-prev"
                onClick={(e) => { e.stopPropagation(); setViewing((viewing - 1 + urls.length) % urls.length); }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="photo-viewer-nav photo-viewer-next"
                onClick={(e) => { e.stopPropagation(); setViewing((viewing + 1) % urls.length); }}
                aria-label="Next photo"
              >
                ›
              </button>
              <span className="photo-viewer-count">{viewing + 1} / {urls.length}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
