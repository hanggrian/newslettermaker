-- Run once in SQL Editor after creating newsletter_state.
-- Allows the Supabase API (service role / anon) to read and write the table.

grant all on table public.newsletter_state to anon;
grant all on table public.newsletter_state to authenticated;
grant all on table public.newsletter_state to service_role;
