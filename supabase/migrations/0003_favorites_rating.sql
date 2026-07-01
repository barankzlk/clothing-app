-- DRIP — store a product's rating alongside a saved favorite
-- Run this in the Supabase SQL editor, or via `supabase db push` with the CLI.

alter table public.favorites add column if not exists image_url text;
alter table public.favorites add column if not exists rating text;
