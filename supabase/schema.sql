-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) to create the table.

create table if not exists newsletter_state (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Allow Supabase API to read/write (required for the app)
grant all on table public.newsletter_state to anon;
grant all on table public.newsletter_state to authenticated;
grant all on table public.newsletter_state to service_role;
