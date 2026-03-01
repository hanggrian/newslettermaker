-- Run this in Supabase → SQL Editor to remove the OLD app's database objects.
-- This drops the newsletter_articles table and its trigger/policies from the
-- Freepik/flaticon image generator. After this, create newsletter_state and seed
-- for the New-Newsletter-Maker app (see schema.sql and scripts/setup-supabase-week1.js).

-- 1. Drop trigger (depends on table)
drop trigger if exists trg_newsletter_articles_updated_at on public.newsletter_articles;

-- 2. Drop RLS policies
drop policy if exists "newsletter_articles_select" on public.newsletter_articles;
drop policy if exists "newsletter_articles_insert" on public.newsletter_articles;
drop policy if exists "newsletter_articles_update" on public.newsletter_articles;
drop policy if exists "newsletter_articles_delete" on public.newsletter_articles;

-- 3. Drop the old app's table (all data in it will be deleted)
drop table if exists public.newsletter_articles;

-- 4. Drop the trigger function if it was only used by newsletter_articles
-- (Skip this line if you use set_updated_at on other tables.)
drop function if exists public.set_updated_at();
