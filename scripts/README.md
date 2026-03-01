# Supabase setup and Week 1 seed

**One command:** `node scripts/setup-supabase-week1.js`

- If the **newsletter_state** table doesn’t exist yet, the script prints SQL. Run that SQL in **Supabase Dashboard → SQL Editor**, then run the script again.
- When the table exists, the script seeds **workspace** and **sessions** (including **"Week 1"**) with the exported articles and image URLs.

Content is stored under **Week 1** so the app can load it via **Load Saved → Week 1**.

Optional: run the seed only with `node scripts/seed-week1-to-supabase.js` (table must already exist).
