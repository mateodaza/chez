-- Migration: Create cook_session_photos table + cook-photos storage bucket
-- Purpose: Store photo proof of completed cooks
-- Affected: new table cook_session_photos, new bucket cook-photos

-- 1. Create the cook_session_photos table
create table if not exists public.cook_session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cook_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

comment on table public.cook_session_photos is 'Photos uploaded as proof of completed cook sessions.';

-- 2. Enable RLS
alter table public.cook_session_photos enable row level security;

-- 3. RLS Policies — users can only access their own photos

create policy "Users can view their own cook photos"
  on public.cook_session_photos
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert their own cook photos"
  on public.cook_session_photos
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete their own cook photos"
  on public.cook_session_photos
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- 4. Index on session_id for joins and user_id for RLS
create index if not exists idx_cook_session_photos_session_id
  on public.cook_session_photos (session_id);

create index if not exists idx_cook_session_photos_user_id
  on public.cook_session_photos (user_id);

-- 5. Create private storage bucket for cook photos
insert into storage.buckets (id, name, public)
values ('cook-photos', 'cook-photos', false)
on conflict (id) do nothing;

-- 6. Storage policies — enforce user folder ownership via path prefix
-- Upload: user can only upload to their own folder {user_id}/...
create policy "Users can upload cook photos to own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'cook-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Read: user can only read their own photos
create policy "Users can read own cook photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'cook-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Delete: user can only delete their own photos
create policy "Users can delete own cook photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'cook-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
