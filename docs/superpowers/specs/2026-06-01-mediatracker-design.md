# MediaTracker — Design Spec
**Date:** 2026-06-01  
**Status:** Approved

---

## Overview

A personal web app for tracking movies and TV shows. Log what you've watched, rate and review it, manage a prioritized watchlist, and organize titles into custom shareable lists. Metadata is pulled automatically from TMDB.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js App Router (React, TypeScript) |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + email/password auth) |
| Deployment | Vercel |
| Metadata | TMDB API (server-side only) |

Single user app. One account, all data private by default. Shareable links are opt-in per list.

---

## Architecture

```
Browser
  └── Next.js App Router (Vercel)
        ├── React UI (Tailwind CSS)
        ├── Server Components for data reads
        ├── API Routes for mutations
        └── Supabase Client
              ├── PostgreSQL (all user data)
              └── Auth (email/password, single user)

External:
  └── TMDB API (metadata + posters, server-side only)
```

- Data reads happen in Server Components — fast, no client-side loading spinners for most views.
- Mutations (log watched, rate, mark episode, etc.) go through API routes.
- TMDB is called server-side only. API key never reaches the browser.
- Shareable links work via a UUID token in the URL that bypasses Supabase Row Level Security for read-only access.

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — recent activity, top-line stats, in-progress shows |
| `/search` | Search TMDB, add to watched or watchlist |
| `/movies` | Full watched movie history, sortable/filterable |
| `/shows` | Full watched show history |
| `/show/[id]` | Show detail with season/episode tracker |
| `/watchlist` | Watchlist with priority tiers |
| `/lists` | All custom lists |
| `/lists/[id]` | Single custom list |
| `/stats` | Full stats and charts |
| `/settings` | Profile share toggles, account settings |
| `/share/list/[token]` | Read-only public view of a shared custom list |
| `/share/watched/[token]` | Read-only public view of your watched history |
| `/share/watchlist/[token]` | Read-only public view of your watchlist |

---

## Data Model

```sql
-- Cached TMDB metadata
media
  id uuid PK
  tmdb_id int UNIQUE
  type text                  -- 'movie' | 'show'
  title text
  overview text
  poster_url text
  genres text[]
  release_year int
  runtime_mins int           -- movie runtime or avg episode runtime
  director text              -- movies only
  cast text[]                -- top billed

-- TV seasons (from TMDB)
seasons
  id uuid PK
  media_id uuid FK → media
  season_number int
  episode_count int

-- User's watched log
watch_entries
  id uuid PK
  user_id uuid FK → auth.users
  media_id uuid FK → media
  rating numeric(2,1)        -- 0.5 to 5.0 in 0.5 steps
  review text                -- nullable
  watched_at date
  rewatch boolean DEFAULT false

-- Per-episode watched status
episode_progress
  id uuid PK
  user_id uuid FK → auth.users
  season_id uuid FK → seasons
  episode_number int
  watched_at date

-- Watchlist
watchlist_items
  id uuid PK
  user_id uuid FK → auth.users
  media_id uuid FK → media
  priority text              -- 'must_watch' | 'want_to_watch' | 'someday'
  added_at timestamptz DEFAULT now()

-- Custom lists
lists
  id uuid PK
  user_id uuid FK → auth.users
  name text
  share_token uuid           -- null until sharing enabled
  is_shared boolean DEFAULT false

-- Profile-level share tokens (watched history + watchlist)
user_settings
  user_id uuid PK FK → auth.users
  watched_share_token uuid   -- null until sharing enabled
  watchlist_share_token uuid -- null until sharing enabled

-- List membership
list_items
  id uuid PK
  list_id uuid FK → lists
  media_id uuid FK → media
  added_at timestamptz DEFAULT now()
```

**Notes:**
- `media` is a local TMDB cache. Written once on first add, read forever after.
- A title can exist in `watch_entries`, `watchlist_items`, and multiple `lists` simultaneously.
- Share tokens live per list. The full watched history can be shared by creating an "All Watched" list.

---

## Feature Details

### Adding a Title
1. User searches from `/search` → TMDB results appear.
2. User picks a result → modal opens: "Mark as Watched" or "Add to Watchlist".
3. If watched: pick date, set 0.5–5 star rating, optionally write review.
4. TMDB metadata cached to `media` on first add.
5. No page navigation — entire flow is a modal.

### Rating System
- 0.5 to 5.0 stars in 0.5 increments (10 effective points).
- Displayed as half-star visuals.
- Rating is optional — can log watched without rating.

### TV Episode Tracking
- Show detail page lists seasons. Each season expands to show episodes as rows with checkboxes.
- Checking an episode writes to `episode_progress` with today's date.
- Progress bar per season: "S2 — 4 / 10 episodes".
- When all episodes in a season are checked, prompt to mark show as watched in the log.

### Watchlist
- Three priority tiers: **Must Watch**, **Want to Watch**, **Someday**.
- Displayed as columns or a filterable list.
- Promoting a title to watched opens the rate/review modal and removes it from the watchlist.

### Custom Lists
- Create named lists from `/lists`.
- Add any title from its detail page or from search results.
- Toggle sharing on a list → generates a `share_token` UUID.
- Anyone with `/share/list/[token]` can view the list read-only (no login required).

### Profile Sharing (Watched History + Watchlist)
- Your full watched history and your watchlist each have their own independent share toggle in settings.
- Enabling either generates a UUID token stored in `user_settings`.
- `/share/watched/[token]` — read-only view of everything you've watched.
- `/share/watchlist/[token]` — read-only view of your watchlist with priority tiers.
- Tokens can be revoked (regenerated) at any time from settings.

### Stats Page
- **Totals:** Movies watched, shows watched, episodes watched, total hours
- **Genre breakdown:** Donut chart by watch count
- **Ratings distribution:** Bar chart (0.5 through 5.0)
- **Activity graph:** Movies + episodes per month, last 12 months
- **Top directors:** Top 5 by count in watched log (movies)
- **Top actors:** Top 5 by appearance count across watched log

### Dashboard (`/`)
- 5 most recently watched titles with poster + rating
- Watchlist item counts per priority tier
- Top-line stats: total watched this year, current show in progress (most recent incomplete show)

---

## Authentication

- Supabase email/password auth.
- Single user — no registration flow needed. Account created once via Supabase dashboard or a one-time setup route.
- All Supabase tables protected by Row Level Security: `user_id = auth.uid()`.
- Share tokens bypass RLS via a public-facing API route that queries by token without requiring auth.

---

## TMDB Integration

- All TMDB calls made server-side (Next.js Server Components or API routes).
- API key stored in Vercel environment variable, never exposed to client.
- On search: call TMDB search endpoint, return results to client.
- On add: fetch full metadata (genres, cast, runtime, poster) and upsert into `media` table.
- For TV shows: also fetch season/episode counts and populate `seasons` table.
- For currently-airing shows, season/episode counts in `seasons` can become stale. When the show detail page loads, episode counts are re-upserted from TMDB so new episodes always appear. Movie metadata is fetched once and never refreshed (release data doesn't change).

---

## Out of Scope

- Import from Letterboxd / Trakt / IMDb
- Multiple user accounts / social features (follows, activity feeds)
- Push notifications or reminders
- Mobile app (web responsive only)
- Offline support
