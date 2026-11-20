-- TripTrace - Sprint 2, Arin Shah
-- Supabase Auth + profiles (replaces the MySQL `users` table from Sprint 1).
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Passwords are handled by Supabase Auth (auth.users, bcrypt-hashed).
-- No password, hashed or otherwise, is stored in public.profiles.

-- ---------------------------------------------------------------------------
-- profiles: one row per Auth user. Adam's profile settings read/update this.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null check (char_length(username) between 1 and 50),
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness (same rule as Sprint 1).
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
create unique index if not exists profiles_email_lower_key    on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only read and update their own profile.
-- Inserts come from the trigger below; deletes cascade from auth.users.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Keep updated_at current on every update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- On sign-up, create the profiles row from the username passed in
-- supabase.auth.signUp({ options: { data: { username } } }).
-- If the username is already taken the unique index raises and the sign-up
-- is rolled back, so a duplicate account can never be created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in step if the user changes their email through Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Helpers the Login page calls before a user is signed in.
-- They are SECURITY DEFINER so they can look past RLS, but they only return
-- a yes/no or a single email, never whole rows.
-- ---------------------------------------------------------------------------

-- Register: is this username free? (gives a clear error before signUp)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(trim(p_username))
  );
$$;

-- Login: Supabase Auth signs in by email, but our login form uses a username.
-- Returns the email for that username, or null if there is no such user.
create or replace function public.email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(trim(p_username)) limit 1;
$$;

revoke all on function public.username_available(text) from public;
revoke all on function public.email_for_username(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.email_for_username(text) to anon, authenticated;
