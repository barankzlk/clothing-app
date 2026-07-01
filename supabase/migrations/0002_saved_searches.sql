-- DRIP — recent searches
-- Run this in the Supabase SQL editor, or via `supabase db push` with the CLI.

-- =====================================================================
-- saved_searches
-- =====================================================================
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  query text not null,
  active_filters text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists saved_searches_user_id_created_at_idx
  on public.saved_searches (user_id, created_at desc);

-- =====================================================================
-- Row Level Security — a user can only see and modify their own rows.
-- =====================================================================
alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own"
  on public.saved_searches for select
  using (auth.uid() = user_id);

drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own"
  on public.saved_searches for delete
  using (auth.uid() = user_id);
