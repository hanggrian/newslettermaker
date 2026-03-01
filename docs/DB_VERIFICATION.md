# Database verification: Newsletter Maker vs existing Supabase schema

**Conclusion: The existing `newsletter_articles` table was built for the old Freepik/flaticon image generator, not for the New-Newsletter-Maker app.**

---

## What the Newsletter Maker app actually uses (from UI + code)

### 1. **Sessions / weeks**
- **Save** and **Load Saved** (e.g. "Week 1") — named snapshots of the full state.
- The app groups everything by **session name** (Week 1, Week 2, etc.), not a flat list of articles.

**Existing DB:** `newsletter_articles` has no `session_name`, `newsletter_id`, or "week" — it's one flat table. No way to group rows into "Week 1" vs "Week 2".

---

### 2. **Per-article fields (Article View + Image View)**

| App field | Purpose | In `newsletter_articles`? |
|-----------|---------|---------------------------|
| `title` | Article title | ✅ `title` |
| `url` | Article link | ✅ `link` (same) |
| `description` | Snippet/summary | ❌ Only `notes` (user notes), no description |
| `date` | Publication date (MM/DD/YY) | ✅ `article_date` / `date` |
| `paywall` | Paywall flag (checkbox) | ❌ Not in the schema you showed |
| `status` | Y / NO / YM / M / COOL FINDS | ✅ `status` |
| `ranks` | MED/THC/CBD/INV as object, e.g. `{ MED: 'Y', THC: 'YM' }` | ⚠️ Table has `med`, `thc`, `cbd`, `inv` as separate text columns — no `ranks` object or `YM`-style values |
| `categories` | Array of category keys | ❌ No array; only four columns |
| `notes` | User notes | ✅ `notes` |
| **`image`** | **Single URL (or path) of the chosen image** | ❌ No `image` or `image_url`. Table has `options` (jsonb array) + `selected` (integer index) from the *old* app’s “pick from search results” flow. |
| `imageSearchQuery` | Keyword for image search | ⚠️ Could map to `keyword` but `keyword` was used differently in the old app |

So: **article-level image** is a single chosen URL in the new app; the old table only has an options array + selected index, and no direct image URL column.

---

### 3. **Inspirational Images (step 4)**
- Newsletter-level list of image URLs (Add by URL, Select from gallery, Selected Images).
- Stored as `inspirationalImages` array.

**Existing DB:** No table or column for newsletter-level inspirational images.

---

### 4. **Text Editor (step 5)**
- Per category (MED, THC, CBD, INV): **intro**, **outro**, and **summaries** (AI-generated).
- Stored as `newsletterContent.MED.intro`, `.outro`, `.summaries`, etc.

**Existing DB:** No place for intro/outro/summaries per category. Only row-level `notes` in `newsletter_articles`.

---

### 5. **Confirmation (step 6)**
- Newsletter name (e.g. "Week 1"), inspirational image count, **COOL** category count (MED, THC, CBD, INV, COOL).
- Export JSON/PDF, Publish.

**Existing DB:** No newsletter-level entity, no COOL-specific column (old app used `med`/`thc`/`cbd`/`inv` = 'C' for cool).

---

## Summary: why the existing DB isn’t built for this

| Need | Old `newsletter_articles` |
|------|----------------------------|
| Sessions/weeks (e.g. Week 1) | ❌ No session or newsletter grouping |
| Article description | ❌ No description column |
| Article paywall | ❌ Not in schema |
| Article image (one URL) | ❌ No `image` / `image_url`; only `options` + `selected` |
| Ranks (e.g. YM) + categories array | ⚠️ Only med/thc/cbd/inv text columns |
| Inspirational images | ❌ No storage |
| Intro/outro/summaries per category | ❌ No storage |
| Newsletter name / COOL count | ❌ No newsletter-level data |

The schema matches the **old** Freepik/flaticon app (one row per article, options array for image picks, linkedin_and_twit, etc.), not the **New-Newsletter-Maker** flow (sessions, one image URL per article, newsletter content, inspirational images).

---

## What to use instead

For the New-Newsletter-Maker app, the right approach is the **key/value state table** we added:

- **Table:** `newsletter_state`
- **Rows:** `key = 'workspace'` (current state), `key = 'sessions'` (all saved sessions by name).
- **Value:** JSON that matches the app’s in-memory state: `articles` (with `image`, `ranks`, `description`, `paywall`, etc.), `archivedArticles`, `inspirationalImages`, `newsletterContent`.

That way the DB is built for this app: sessions like "Week 1", article images, intro/outro, and inspirational images are all stored in one place and stay in sync with the UI.

Create **`newsletter_state`** (see `supabase/schema.sql`) and use it for this project; leave **`newsletter_articles`** for the old app or future migration only.

---

## Vercel: seeing "Week 1" and saved sessions

The app loads **workspace** and **sessions** from the API on page load (and when you click **Refresh from server**). If you don’t see Week 1 in **Load Saved** on newlettermaker.vercel.app:

1. **Set Supabase env vars in Vercel**  
   Vercel → your project → **Settings** → **Environment Variables**  
   Add:
   - `SUPABASE_URL` = your Supabase project URL  
   - `SUPABASE_SECRET_KEY` = your Supabase service role or anon key  

2. **Redeploy** (e.g. trigger a new deployment or push a commit).

3. Open the app, go to **Article View**, and click **Refresh from server**.  
   You should see "Week 1" in the dropdown and the 33 articles in the workspace (or choose Week 1 and click **Load**).
