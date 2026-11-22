-- TripTrace - Sprint 2, Axel Bengoa (Req 10 Persist, Storage slice)
--
-- Experiences, photos, and the Storage bucket that holds the photo files.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (everything is "if not exists" / "drop ... if exists").
--
-- NOTE for Marcos: the experiences/photos tables are your slice. They are
-- defined here (if not exists) so the Storage + frontend wiring can run end to
-- end. If your migration changes column names, update
-- frontend/src/lib/experiences.ts to match.

-- ---------------------------------------------------------------------------
-- experiences: one row per pin on the map.
-- ---------------------------------------------------------------------------
create table if not exists public.experiences (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 200),
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  country    text not null default '',
  state      text not null default '',
  rating     smallint check (rating between 1 and 5),          -- null = not rated
  notes      text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiences_user_id_idx on public.experiences (user_id);
create index if not exists experiences_user_rating_idx on public.experiences (user_id, rating);

drop trigger if exists experiences_touch_updated_at on public.experiences;
create trigger experiences_touch_updated_at
  before update on public.experiences
  for each row execute function public.touch_updated_at();   -- defined in 001

-- ---------------------------------------------------------------------------
-- photos: one row per uploaded file. `path` is the object key inside the
-- experience-photos bucket: <user_id>/<experience_id>/<uuid>.<ext>
-- Deleting an experience cascades to its photo rows. The Storage objects are
-- removed by the client (deleteExperience in lib/experiences.ts).
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id            bigint generated always as identity primary key,
  experience_id bigint not null references public.experiences (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path          text not null unique,
  name          text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists photos_experience_id_idx on public.photos (experience_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: own rows only.
-- ---------------------------------------------------------------------------
alter table public.experiences enable row level security;
alter table public.photos      enable row level security;

drop policy if exists "experiences: own rows" on public.experiences;
create policy "experiences: own rows" on public.experiences
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A photo row must belong to the user AND point at one of the user's experiences.
drop policy if exists "photos: own rows" on public.photos;
create policy "photos: own rows" on public.photos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket, JPEG/PNG only, 10 MB max (same rule as the form).
-- Files are read through short-lived signed URLs, never public links.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('experience-photos', 'experience-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A user may only touch objects under their own <user_id>/ folder.
drop policy if exists "experience-photos: select own" on storage.objects;
create policy "experience-photos: select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "experience-photos: insert own" on storage.objects;
create policy "experience-photos: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "experience-photos: update own" on storage.objects;
create policy "experience-photos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "experience-photos: delete own" on storage.objects;
create policy "experience-photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = auth.uid()::text);
