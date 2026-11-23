// Experience persistence on Supabase Postgres + Storage (Axel Bengoa, Sprint 2).
//
// Replaces the Sprint 1 localStorage list and the IndexedDB photoStore.
// Every call runs as the signed-in user, so RLS limits it to their own rows
// and their own <user_id>/ folder in the experience-photos bucket.
//
//   listExperiences({ minRating })  -> map markers + details (photos signed)
//   saveExperience(input)           -> create or edit, uploads/removes photos
//   deleteExperience(experience)    -> for Adam's Req 9 delete button
//
// Schema: supabase/migrations/002_experiences_photos_storage.sql
import { supabase } from './supabase';

export const PHOTO_BUCKET = 'experience-photos';
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour; the map reloads them on every visit

export type Photo = {
  id: number;
  path: string;
  name: string;
  url: string; // signed URL, ready for <img src>
};

export type Experience = {
  id: number;
  userId: string;
  title: string;
  lat: number;
  lng: number;
  country: string;
  state: string;
  rating: number | null;
  notes: string;
  photos: Photo[];
};

type PhotoRow = { id: number; path: string; name: string; created_at: string };
type ExperienceRow = {
  id: number;
  user_id: string;
  title: string;
  lat: number;
  lng: number;
  country: string;
  state: string;
  rating: number | null;
  notes: string;
  photos: PhotoRow[];
};

const SELECT = 'id, user_id, title, lat, lng, country, state, rating, notes, photos (id, path, name, created_at)';

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You must be signed in.');
  return data.user.id;
}

// Signs every photo path in one request and maps rows to Experience objects.
async function withSignedPhotos(rows: ExperienceRow[]): Promise<Experience[]> {
  const paths = rows.flatMap((row) => row.photos.map((p) => p.path));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) throw error;
    data.forEach((item) => {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    });
  }

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    lat: row.lat,
    lng: row.lng,
    country: row.country,
    state: row.state,
    rating: row.rating,
    notes: row.notes,
    photos: [...row.photos]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
      .filter((p) => urlByPath.has(p.path))
      .map((p) => ({ id: p.id, path: p.path, name: p.name, url: urlByPath.get(p.path)! })),
  }));
}

// The signed-in user's experiences. minRating (1-5) keeps only experiences
// rated at least that many stars; null/undefined returns everything.
export async function listExperiences(opts: { minRating?: number | null } = {}): Promise<Experience[]> {
  const userId = await currentUserId();
  let query = supabase.from('experiences').select(SELECT).eq('user_id', userId).order('created_at');
  if (opts.minRating) query = query.gte('rating', opts.minRating);
  const { data, error } = await query;
  if (error) throw error;
  return withSignedPhotos((data ?? []) as ExperienceRow[]);
}

export type SaveExperienceInput = {
  id?: number; // set when editing
  title: string;
  lat: number;
  lng: number;
  country: string;
  state: string;
  rating: number | null;
  notes: string;
  keepPhotoIds: number[]; // existing photos the user did not remove (edit only)
  newFiles: File[]; // newly selected photos to upload
};

function extensionFor(file: File): string {
  return file.type === 'image/png' ? 'png' : 'jpg';
}

async function removeObjects(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) console.error('Removing photo files failed', error);
}

// Creates or updates an experience, uploads new photos to Storage, records
// them in `photos`, and removes photos the user took out while editing.
export async function saveExperience(input: SaveExperienceInput): Promise<number> {
  const userId = await currentUserId();
  const fields = {
    title: input.title.trim(),
    lat: input.lat,
    lng: input.lng,
    country: input.country,
    state: input.state,
    rating: input.rating,
    notes: input.notes,
  };

  let experienceId: number;
  let removedPaths: string[] = [];

  if (input.id) {
    experienceId = input.id;
    const { error } = await supabase.from('experiences').update(fields).eq('id', experienceId);
    if (error) throw error;

    // Work out which saved photos were removed in the edit form.
    const { data: existing, error: listError } = await supabase
      .from('photos')
      .select('id, path')
      .eq('experience_id', experienceId);
    if (listError) throw listError;
    const keep = new Set(input.keepPhotoIds);
    const removed = (existing ?? []).filter((p) => !keep.has(p.id));
    if (removed.length > 0) {
      const { error: deleteError } = await supabase.from('photos').delete().in('id', removed.map((p) => p.id));
      if (deleteError) throw deleteError;
      removedPaths = removed.map((p) => p.path);
    }
  } else {
    const { data, error } = await supabase.from('experiences').insert({ ...fields, user_id: userId }).select('id').single();
    if (error) throw error;
    experienceId = data.id;
  }

  // Upload new files, then record them. On failure, clean up what was uploaded.
  const uploaded: { path: string; name: string }[] = [];
  try {
    for (const file of input.newFiles) {
      const path = `${userId}/${experienceId}/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      uploaded.push({ path, name: file.name });
    }
    if (uploaded.length > 0) {
      const { error } = await supabase
        .from('photos')
        .insert(uploaded.map((u) => ({ ...u, experience_id: experienceId, user_id: userId })));
      if (error) throw error;
    }
  } catch (err) {
    await removeObjects(uploaded.map((u) => u.path));
    // A brand-new experience with failed photos would be half-saved; undo it.
    if (!input.id) await supabase.from('experiences').delete().eq('id', experienceId);
    throw err;
  }

  // Only delete removed files once everything else succeeded.
  await removeObjects(removedPaths);
  return experienceId;
}

// Deletes the experience row (photo rows cascade) and its files in Storage.
// For Adam's Req 9 delete flow.
export async function deleteExperience(
  experience: Pick<Experience, 'id' | 'userId'>
): Promise<{ cleanupWarning?: string }> {
  const folder = `${experience.userId}/${experience.id}`;
  const { data: files, error: listError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(folder, { limit: 1000 });
  if (listError) throw listError;

  const { data: deleted, error } = await supabase
    .from('experiences')
    .delete()
    .eq('id', experience.id)
    .eq('user_id', experience.userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!deleted) throw new Error('Experience not found or no longer available.');

  const paths = (files ?? []).map((file) => `${folder}/${file.name}`);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    if (removeError) {
      console.error('Removing deleted experience photos failed', removeError);
      return { cleanupWarning: 'The experience was deleted, but some photo files could not be removed.' };
    }
  }
  return {};
}
