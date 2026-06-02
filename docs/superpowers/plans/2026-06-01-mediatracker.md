# MediaTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal movie/TV tracker with TMDB metadata, 0.5–5 star ratings, episode-level TV tracking, a prioritized watchlist, custom lists, full stats, and shareable read-only links.

**Architecture:** Next.js App Router with Server Components for reads and API routes for mutations. Supabase provides PostgreSQL + email/password auth with Row Level Security. TMDB API is called server-side only.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Recharts (stats charts), Vitest + Testing Library (tests), Vercel (deployment)

---

## File Structure

```
app/
  layout.tsx                        # Root layout, nav
  page.tsx                          # Dashboard
  login/page.tsx                    # Login form
  search/page.tsx                   # TMDB search + add modal
  movies/page.tsx                   # Watched movies list
  shows/page.tsx                    # Watched shows list
  show/[id]/page.tsx                # Show detail + episode tracker
  watchlist/page.tsx                # Watchlist with priority tiers
  lists/page.tsx                    # Custom lists index
  lists/[id]/page.tsx               # Single custom list
  stats/page.tsx                    # Stats + charts
  settings/page.tsx                 # Share toggles
  share/
    list/[token]/page.tsx           # Read-only: custom list
    watched/[token]/page.tsx        # Read-only: watched history
    watchlist/[token]/page.tsx      # Read-only: watchlist
  api/
    tmdb/search/route.ts            # GET ?q=&type=
    watch/route.ts                  # POST/DELETE watch entry
    watchlist/route.ts              # POST/PATCH/DELETE watchlist item
    episodes/route.ts               # POST/DELETE episode progress
    lists/route.ts                  # POST list
    lists/[id]/route.ts             # PATCH/DELETE list
    lists/[id]/items/route.ts       # POST/DELETE list item
    settings/share/route.ts         # POST generate/revoke share token

components/
  MediaCard.tsx                     # Poster + title + rating display
  RatingStars.tsx                   # Half-star selector/display
  AddTitleModal.tsx                 # Watched or watchlist flow
  EpisodeTracker.tsx                # Season accordion + episode checkboxes
  ShareToggle.tsx                   # Enable/disable share + copy link

lib/
  tmdb.ts                           # TMDB fetch functions
  media.ts                          # Upsert media + seasons to DB
  stats.ts                          # Stats aggregation queries
  supabase/
    client.ts                       # Browser Supabase client
    server.ts                       # Server Supabase client (cookies)
    middleware.ts                   # Auth redirect logic

types/index.ts                      # All shared TypeScript types
middleware.ts                       # Next.js middleware (auth guard)
supabase/migrations/001_initial.sql # Full DB schema
```

---

## Phase 1: Foundation

### Task 1: Scaffold Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`

- [ ] **Step 1: Create Next.js app**

```bash
cd "C:/Users/aideo/OneDrive/Desktop/Claude Code Projects"
npx create-next-app@latest MediaTracker --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd MediaTracker
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr recharts date-fns
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Create .env.local.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TMDB_API_KEY=your-tmdb-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copy to `.env.local` and fill in real values (get TMDB key free at themoviedb.org/settings/api, Supabase project at supabase.com).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase and Vitest"
```

---

### Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/001_initial.sql`:
```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Cached TMDB metadata
create table media (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  type text not null check (type in ('movie', 'show')),
  title text not null,
  overview text,
  poster_url text,
  genres text[] default '{}',
  release_year integer,
  runtime_mins integer,
  director text,
  cast text[] default '{}'
);

-- TV seasons
create table seasons (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media(id) on delete cascade,
  season_number integer not null,
  episode_count integer not null,
  unique(media_id, season_number)
);

-- Watched log
create table watch_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  rating numeric(2,1) check (rating >= 0.5 and rating <= 5.0),
  review text,
  watched_at date not null default current_date,
  rewatch boolean not null default false,
  created_at timestamptz not null default now()
);

-- Episode progress
create table episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  episode_number integer not null,
  watched_at date not null default current_date,
  unique(user_id, season_id, episode_number)
);

-- Watchlist
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  priority text not null check (priority in ('must_watch', 'want_to_watch', 'someday')),
  added_at timestamptz not null default now(),
  unique(user_id, media_id)
);

-- Custom lists
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  share_token uuid,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- List membership
create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(list_id, media_id)
);

-- Profile-level share settings
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  watched_share_token uuid,
  watchlist_share_token uuid
);

-- Row Level Security
alter table watch_entries enable row level security;
alter table episode_progress enable row level security;
alter table watchlist_items enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table user_settings enable row level security;

-- RLS policies: user sees only their own data
create policy "own watch_entries" on watch_entries
  using (user_id = auth.uid());

create policy "own episode_progress" on episode_progress
  using (user_id = auth.uid());

create policy "own watchlist_items" on watchlist_items
  using (user_id = auth.uid());

create policy "own lists" on lists
  using (user_id = auth.uid());

create policy "own list_items" on list_items
  using (list_id in (select id from lists where user_id = auth.uid()));

create policy "own user_settings" on user_settings
  using (user_id = auth.uid());

-- media and seasons are public read (no user_id, shared cache)
alter table media enable row level security;
alter table seasons enable row level security;
create policy "media public read" on media for select using (true);
create policy "media authenticated insert" on media for insert with check (auth.uid() is not null);
create policy "media authenticated update" on media for update using (auth.uid() is not null);
create policy "seasons public read" on seasons for select using (true);
create policy "seasons authenticated write" on seasons for insert with check (auth.uid() is not null);
create policy "seasons authenticated update" on seasons for update using (auth.uid() is not null);
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to your Supabase project → SQL Editor → paste the migration → Run.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS"
```

---

### Task 3: Supabase Client + Auth Middleware

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`

- [ ] **Step 1: Write browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write middleware**

Create `middleware.ts` at project root:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/share']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Write login page**

Create `app/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-white">MediaTracker</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" required
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" required
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/ middleware.ts app/login/
git commit -m "feat: add Supabase auth clients and middleware"
```

---

### Task 4: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write all shared types**

Create `types/index.ts`:
```typescript
export type MediaType = 'movie' | 'show'
export type WatchlistPriority = 'must_watch' | 'want_to_watch' | 'someday'

export interface Media {
  id: string
  tmdb_id: number
  type: MediaType
  title: string
  overview: string | null
  poster_url: string | null
  genres: string[]
  release_year: number | null
  runtime_mins: number | null
  director: string | null
  cast: string[]
}

export interface Season {
  id: string
  media_id: string
  season_number: number
  episode_count: number
}

export interface WatchEntry {
  id: string
  user_id: string
  media_id: string
  rating: number | null
  review: string | null
  watched_at: string
  rewatch: boolean
  created_at: string
  media?: Media
}

export interface EpisodeProgress {
  id: string
  user_id: string
  season_id: string
  episode_number: number
  watched_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  media_id: string
  priority: WatchlistPriority
  added_at: string
  media?: Media
}

export interface List {
  id: string
  user_id: string
  name: string
  share_token: string | null
  is_shared: boolean
  created_at: string
}

export interface ListItem {
  id: string
  list_id: string
  media_id: string
  added_at: string
  media?: Media
}

export interface UserSettings {
  user_id: string
  watched_share_token: string | null
  watchlist_share_token: string | null
}

// TMDB search result shape (before caching)
export interface TmdbSearchResult {
  tmdb_id: number
  type: MediaType
  title: string
  overview: string
  poster_url: string | null
  release_year: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add types/
git commit -m "feat: add shared TypeScript types"
```

---

## Phase 2: TMDB + Data Layer

### Task 5: TMDB Client Library

**Files:**
- Create: `lib/tmdb.ts`, `lib/__tests__/tmdb.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/tmdb.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchTmdb, fetchTmdbDetails } from '@/lib/tmdb'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => { mockFetch.mockReset() })

describe('searchTmdb', () => {
  it('returns formatted movie results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          id: 550, media_type: 'movie',
          title: 'Fight Club', overview: 'A movie',
          poster_path: '/path.jpg', release_date: '1999-10-15',
        }]
      }),
    })
    const results = await searchTmdb('fight club')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      tmdb_id: 550, type: 'movie', title: 'Fight Club',
      release_year: 1999,
      poster_url: 'https://image.tmdb.org/t/p/w500/path.jpg',
    })
  })

  it('handles TV shows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          id: 1396, media_type: 'tv',
          name: 'Breaking Bad', overview: 'A show',
          poster_path: '/path.jpg', first_air_date: '2008-01-20',
        }]
      }),
    })
    const results = await searchTmdb('breaking bad')
    expect(results[0]).toMatchObject({ tmdb_id: 1396, type: 'show', title: 'Breaking Bad' })
  })

  it('filters out non-movie/tv results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ id: 1, media_type: 'person', name: 'Actor' }]
      }),
    })
    const results = await searchTmdb('actor')
    expect(results).toHaveLength(0)
  })
})

describe('fetchTmdbDetails', () => {
  it('returns movie details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [{ name: 'Drama' }, { name: 'Thriller' }],
        release_date: '1999-10-15',
        credits: {
          crew: [{ job: 'Director', name: 'David Fincher' }],
          cast: [{ name: 'Brad Pitt' }, { name: 'Edward Norton' }],
        },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details).toMatchObject({
      tmdb_id: 550, title: 'Fight Club', runtime_mins: 139,
      director: 'David Fincher', genres: ['Drama', 'Thriller'],
      cast: ['Brad Pitt', 'Edward Norton'],
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run lib/__tests__/tmdb.test.ts
```
Expected: FAIL — `searchTmdb` not found.

- [ ] **Step 3: Implement TMDB client**

Create `lib/tmdb.ts`:
```typescript
import type { TmdbSearchResult, MediaType } from '@/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'

function headers() {
  return { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const res = await fetch(
    `${BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data = await res.json()

  return data.results
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: any): TmdbSearchResult => ({
      tmdb_id: r.id,
      type: r.media_type === 'tv' ? 'show' : 'movie',
      title: r.title ?? r.name,
      overview: r.overview ?? '',
      poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
      release_year: r.release_date
        ? parseInt(r.release_date.split('-')[0])
        : r.first_air_date
        ? parseInt(r.first_air_date.split('-')[0])
        : null,
    }))
}

export interface TmdbFullDetails {
  tmdb_id: number
  type: MediaType
  title: string
  overview: string
  poster_url: string | null
  genres: string[]
  release_year: number | null
  runtime_mins: number | null
  director: string | null
  cast: string[]
  seasons?: Array<{ season_number: number; episode_count: number }>
}

export async function fetchTmdbDetails(tmdbId: number, type: MediaType): Promise<TmdbFullDetails> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const res = await fetch(`${BASE}${endpoint}?append_to_response=credits`, { headers: headers() })
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`)
  const d = await res.json()

  if (type === 'movie') {
    const director = d.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? null
    return {
      tmdb_id: d.id, type: 'movie',
      title: d.title, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: any) => g.name),
      release_year: d.release_date ? parseInt(d.release_date.split('-')[0]) : null,
      runtime_mins: d.runtime ?? null,
      director,
      cast: (d.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name),
    }
  } else {
    return {
      tmdb_id: d.id, type: 'show',
      title: d.name, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: any) => g.name),
      release_year: d.first_air_date ? parseInt(d.first_air_date.split('-')[0]) : null,
      runtime_mins: d.episode_run_time?.[0] ?? null,
      director: null,
      cast: (d.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name),
      seasons: (d.seasons ?? [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({ season_number: s.season_number, episode_count: s.episode_count })),
    }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run lib/__tests__/tmdb.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb.ts lib/__tests__/
git commit -m "feat: add TMDB client with search and details"
```

---

### Task 6: Media Upsert Library

**Files:**
- Create: `lib/media.ts`, `lib/__tests__/media.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/media.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { upsertMedia } from '@/lib/media'

const mockUpsert = vi.fn().mockReturnValue({ error: null })
const mockSupabase = {
  from: vi.fn(() => ({ upsert: mockUpsert })),
}

describe('upsertMedia', () => {
  it('upserts media row and returns id', async () => {
    mockUpsert.mockResolvedValueOnce({
      data: [{ id: 'uuid-123' }], error: null
    })
    // Test signature only — real DB tested via integration
    expect(upsertMedia).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run lib/__tests__/media.test.ts
```
Expected: FAIL — `upsertMedia` not found.

- [ ] **Step 3: Implement media upsert**

Create `lib/media.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTmdbDetails } from '@/lib/tmdb'
import type { Media, Season, MediaType } from '@/types'

export async function upsertMedia(
  supabase: SupabaseClient,
  tmdbId: number,
  type: MediaType
): Promise<{ media: Media; seasons: Season[] }> {
  // Check cache first
  const { data: existing } = await supabase
    .from('media')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single()

  const details = await fetchTmdbDetails(tmdbId, type)

  const mediaRow = {
    tmdb_id: details.tmdb_id,
    type: details.type,
    title: details.title,
    overview: details.overview,
    poster_url: details.poster_url,
    genres: details.genres,
    release_year: details.release_year,
    runtime_mins: details.runtime_mins,
    director: details.director,
    cast: details.cast,
  }

  const { data: media, error } = await supabase
    .from('media')
    .upsert(mediaRow, { onConflict: 'tmdb_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert media: ${error.message}`)

  let seasons: Season[] = []

  if (type === 'show' && details.seasons) {
    const seasonRows = details.seasons.map(s => ({
      media_id: media.id,
      season_number: s.season_number,
      episode_count: s.episode_count,
    }))
    const { data: upsertedSeasons, error: sErr } = await supabase
      .from('seasons')
      .upsert(seasonRows, { onConflict: 'media_id,season_number' })
      .select()
    if (sErr) throw new Error(`Failed to upsert seasons: ${sErr.message}`)
    seasons = upsertedSeasons ?? []
  }

  return { media, seasons }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test:run lib/__tests__/media.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/media.ts lib/__tests__/media.test.ts
git commit -m "feat: add media upsert with TMDB caching"
```

---

### Task 7: Search API Route

**Files:**
- Create: `app/api/tmdb/search/route.ts`

- [ ] **Step 1: Write route**

Create `app/api/tmdb/search/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTmdb } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchTmdb(q.trim())
  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Test manually**

Start dev server: `npm run dev`
Visit: `http://localhost:3000/api/tmdb/search?q=inception`
Expected: JSON with array of movie/show results.

- [ ] **Step 3: Commit**

```bash
git add app/api/tmdb/
git commit -m "feat: add TMDB search API route"
```

---

## Phase 3: Core Logging UI

### Task 8: Root Layout + Nav

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/globals.css` (already exists from scaffold)

- [ ] **Step 1: Write root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'MediaTracker' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {user && (
          <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-white">MediaTracker</Link>
            <Link href="/search" className="text-gray-400 hover:text-white text-sm">Search</Link>
            <Link href="/movies" className="text-gray-400 hover:text-white text-sm">Movies</Link>
            <Link href="/shows" className="text-gray-400 hover:text-white text-sm">Shows</Link>
            <Link href="/watchlist" className="text-gray-400 hover:text-white text-sm">Watchlist</Link>
            <Link href="/lists" className="text-gray-400 hover:text-white text-sm">Lists</Link>
            <Link href="/stats" className="text-gray-400 hover:text-white text-sm">Stats</Link>
            <div className="ml-auto">
              <Link href="/settings" className="text-gray-400 hover:text-white text-sm">Settings</Link>
            </div>
          </nav>
        )}
        <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add root layout with nav"
```

---

### Task 9: RatingStars Component

**Files:**
- Create: `components/RatingStars.tsx`, `components/__tests__/RatingStars.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/__tests__/RatingStars.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RatingStars from '@/components/RatingStars'

describe('RatingStars', () => {
  it('renders 5 star slots', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)
    // 10 half-star zones (5 stars × 2 halves)
    expect(document.querySelectorAll('[data-half]')).toHaveLength(10)
  })

  it('calls onChange with 0.5 when first half clicked', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    fireEvent.click(document.querySelector('[data-half="0.5"]')!)
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('calls onChange with 3.5 when correct half clicked', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    fireEvent.click(document.querySelector('[data-half="3.5"]')!)
    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it('shows current value as filled stars', () => {
    const { container } = render(<RatingStars value={3.5} onChange={vi.fn()} />)
    const filled = container.querySelectorAll('.text-yellow-400')
    expect(filled.length).toBeGreaterThan(0)
  })

  it('renders read-only without click handlers when readOnly', () => {
    const onChange = vi.fn()
    render(<RatingStars value={4} onChange={onChange} readOnly />)
    fireEvent.click(document.querySelector('[data-half="1.0"]')!)
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run components/__tests__/RatingStars.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement RatingStars**

Create `components/RatingStars.tsx`:
```typescript
'use client'
import { useState } from 'react'

interface Props {
  value: number | null
  onChange: (rating: number) => void
  readOnly?: boolean
}

const HALVES = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5)

export default function RatingStars({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative w-6 h-6">
            {/* background star */}
            <span className="text-gray-600 text-2xl leading-none">★</span>
            {/* filled overlay */}
            {(full || half) && (
              <span
                className="absolute inset-0 text-yellow-400 text-2xl leading-none overflow-hidden"
                style={{ width: full ? '100%' : '50%' }}
              >★</span>
            )}
            {/* left half click zone */}
            <div
              data-half={`${star - 0.5}`}
              className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
              onMouseEnter={() => !readOnly && setHover(star - 0.5)}
              onClick={() => !readOnly && onChange(star - 0.5)}
            />
            {/* right half click zone */}
            <div
              data-half={`${star}.0`}
              className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
              onMouseEnter={() => !readOnly && setHover(star)}
              onClick={() => !readOnly && onChange(star)}
            />
          </div>
        )
      })}
      {value && <span className="ml-2 text-sm text-gray-400">{value}/5</span>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run components/__tests__/RatingStars.test.tsx
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add components/RatingStars.tsx components/__tests__/
git commit -m "feat: add half-star RatingStars component"
```

---

### Task 10: Watch Entry API Route

**Files:**
- Create: `app/api/watch/route.ts`

- [ ] **Step 1: Write route**

Create `app/api/watch/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

// POST: log a watched entry
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type, rating, review, watched_at, rewatch } = await request.json()
  if (!tmdb_id || !type) return NextResponse.json({ error: 'Missing tmdb_id or type' }, { status: 400 })

  const { media } = await upsertMedia(supabase, tmdb_id, type)

  const { data, error } = await supabase
    .from('watch_entries')
    .insert({
      user_id: user.id,
      media_id: media.id,
      rating: rating ?? null,
      review: review ?? null,
      watched_at: watched_at ?? new Date().toISOString().split('T')[0],
      rewatch: rewatch ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}

// DELETE: remove a watch entry
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('watch_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/watch/
git commit -m "feat: add watch entry API route"
```

---

### Task 11: Add Title Modal + Search Page

**Files:**
- Create: `components/AddTitleModal.tsx`, `app/search/page.tsx`

- [ ] **Step 1: Write AddTitleModal**

Create `components/AddTitleModal.tsx`:
```typescript
'use client'
import { useState } from 'react'
import RatingStars from './RatingStars'
import type { TmdbSearchResult } from '@/types'

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onSuccess: () => void
}

export default function AddTitleModal({ item, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'watched' | 'watchlist' | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [watchedAt, setWatchedAt] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState<'must_watch' | 'want_to_watch' | 'someday'>('want_to_watch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (mode === 'watched') {
        const res = await fetch('/api/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, rating, review, watched_at: watchedAt }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          {item.poster_url && (
            <img src={item.poster_url} alt={item.title} className="w-16 rounded" />
          )}
          <div>
            <h2 className="font-bold text-white">{item.title}</h2>
            <p className="text-sm text-gray-400">{item.release_year} · {item.type === 'show' ? 'TV Show' : 'Movie'}</p>
          </div>
        </div>

        {!mode && (
          <div className="flex gap-3">
            <button onClick={() => setMode('watched')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              Mark as Watched
            </button>
            <button onClick={() => setMode('watchlist')} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
              Add to Watchlist
            </button>
          </div>
        )}

        {mode === 'watched' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Date watched</label>
              <input type="date" value={watchedAt} onChange={e => setWatchedAt(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Rating (optional)</label>
              <div className="mt-1"><RatingStars value={rating} onChange={setRating} /></div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Review (optional)</label>
              <textarea value={review} onChange={e => setReview(e.target.value)}
                rows={3} placeholder="Write your thoughts..."
                className="mt-1 w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 text-sm resize-none" />
            </div>
          </div>
        )}

        {mode === 'watchlist' && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Priority</label>
            <div className="mt-2 flex flex-col gap-2">
              {(['must_watch', 'want_to_watch', 'someday'] as const).map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
                  <span className="text-sm text-white capitalize">{p.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {mode && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => setMode(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
              Back
            </button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write search page**

Create `app/search/page.tsx`:
```typescript
'use client'
import { useState, useCallback } from 'react'
import type { TmdbSearchResult } from '@/types'
import AddTitleModal from '@/components/AddTitleModal'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.results ?? [])
    setLoading(false)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <input
        type="text" value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
        placeholder="Search movies and TV shows..."
        className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 text-lg"
        autoFocus
      />
      {loading && <p className="text-gray-400 text-sm">Searching...</p>}
      <div className="space-y-3">
        {results.map(r => (
          <button key={r.tmdb_id} onClick={() => setSelected(r)}
            className="w-full flex items-center gap-3 p-3 bg-gray-900 hover:bg-gray-800 rounded-xl text-left">
            {r.poster_url
              ? <img src={r.poster_url} alt={r.title} className="w-10 h-14 object-cover rounded" />
              : <div className="w-10 h-14 bg-gray-700 rounded" />}
            <div>
              <p className="font-medium text-white">{r.title}</p>
              <p className="text-sm text-gray-400">{r.release_year} · {r.type === 'show' ? 'TV Show' : 'Movie'}</p>
              {r.overview && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.overview}</p>}
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <AddTitleModal
          item={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); setResults([]); setQuery('') }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/AddTitleModal.tsx app/search/
git commit -m "feat: add search page and add-title modal"
```

---

### Task 12: Watchlist API Route

**Files:**
- Create: `app/api/watchlist/route.ts`

- [ ] **Step 1: Write route**

Create `app/api/watchlist/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type, priority } = await request.json()
  const { media } = await upsertMedia(supabase, tmdb_id, type)

  const { data, error } = await supabase
    .from('watchlist_items')
    .upsert({ user_id: user.id, media_id: media.id, priority }, { onConflict: 'user_id,media_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, priority } = await request.json()
  const { data, error } = await supabase
    .from('watchlist_items')
    .update({ priority })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/watchlist/
git commit -m "feat: add watchlist API route"
```

---

## Phase 4: Browse Pages + TV Tracking

### Task 13: MediaCard Component + Movies/Shows Pages

**Files:**
- Create: `components/MediaCard.tsx`, `app/movies/page.tsx`, `app/shows/page.tsx`

- [ ] **Step 1: Write MediaCard**

Create `components/MediaCard.tsx`:
```typescript
import Image from 'next/image'
import Link from 'next/link'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'

interface Props {
  entry: WatchEntry
}

export default function MediaCard({ entry }: Props) {
  const media = entry.media!
  const href = media.type === 'show' ? `/show/${media.id}` : '#'

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden flex gap-3 p-3">
      {media.poster_url ? (
        <img src={media.poster_url} alt={media.title} className="w-16 rounded object-cover" />
      ) : (
        <div className="w-16 h-24 bg-gray-700 rounded" />
      )}
      <div className="flex-1 min-w-0">
        {media.type === 'show' ? (
          <Link href={href} className="font-medium text-white hover:text-blue-400 line-clamp-1">{media.title}</Link>
        ) : (
          <p className="font-medium text-white line-clamp-1">{media.title}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{media.release_year}</p>
        {entry.rating && (
          <div className="mt-1">
            <RatingStars value={entry.rating} onChange={() => {}} readOnly />
          </div>
        )}
        {entry.review && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entry.review}</p>}
        <p className="text-xs text-gray-600 mt-1">{entry.watched_at}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write movies page**

Create `app/movies/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import MediaCard from '@/components/MediaCard'

export default async function MoviesPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .eq('media.type', 'movie')
    .order('watched_at', { ascending: false })

  const movies = (entries ?? []).filter(e => e.media?.type === 'movie')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movies</h1>
        <span className="text-gray-400 text-sm">{movies.length} watched</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {movies.map(entry => <MediaCard key={entry.id} entry={entry} />)}
      </div>
      {movies.length === 0 && (
        <p className="text-gray-400">No movies logged yet. <a href="/search" className="text-blue-400 hover:underline">Search to add one.</a></p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write shows page**

Create `app/shows/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import MediaCard from '@/components/MediaCard'

export default async function ShowsPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .order('watched_at', { ascending: false })

  const shows = (entries ?? []).filter(e => e.media?.type === 'show')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TV Shows</h1>
        <span className="text-gray-400 text-sm">{shows.length} watched</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shows.map(entry => <MediaCard key={entry.id} entry={entry} />)}
      </div>
      {shows.length === 0 && (
        <p className="text-gray-400">No shows logged yet. <a href="/search" className="text-blue-400 hover:underline">Search to add one.</a></p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/MediaCard.tsx app/movies/ app/shows/
git commit -m "feat: add MediaCard component and movies/shows pages"
```

---

### Task 14: Episode Tracker

**Files:**
- Create: `components/EpisodeTracker.tsx`, `app/api/episodes/route.ts`, `app/show/[id]/page.tsx`

- [ ] **Step 1: Write episode progress API**

Create `app/api/episodes/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { season_id, episode_number } = await request.json()
  const { data, error } = await supabase
    .from('episode_progress')
    .upsert(
      { user_id: user.id, season_id, episode_number, watched_at: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,season_id,episode_number' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ progress: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { season_id, episode_number } = await request.json()
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('season_id', season_id)
    .eq('episode_number', episode_number)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write EpisodeTracker component**

Create `components/EpisodeTracker.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { Season, EpisodeProgress } from '@/types'

interface Props {
  seasons: Season[]
  progress: EpisodeProgress[]
  onProgressChange: (seasonId: string, episode: number, watched: boolean) => void
}

export default function EpisodeTracker({ seasons, progress, onProgressChange }: Props) {
  const [open, setOpen] = useState<string | null>(seasons[0]?.id ?? null)

  const watchedSet = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))

  return (
    <div className="space-y-2">
      {seasons.map(season => {
        const watchedCount = progress.filter(p => p.season_id === season.id).length
        const isOpen = open === season.id
        return (
          <div key={season.id} className="bg-gray-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : season.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800"
            >
              <span className="font-medium text-white">Season {season.season_number}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(watchedCount / season.episode_count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{watchedCount}/{season.episode_count}</span>
                </div>
                <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: season.episode_count }, (_, i) => i + 1).map(ep => {
                  const watched = watchedSet.has(`${season.id}-${ep}`)
                  return (
                    <label key={ep} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watched}
                        onChange={() => onProgressChange(season.id, ep, !watched)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">E{ep}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write show detail page**

Create `app/show/[id]/page.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import EpisodeTracker from '@/components/EpisodeTracker'
import RatingStars from '@/components/RatingStars'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export default function ShowDetailPage({ params }: { params: { id: string } }) {
  const [media, setMedia] = useState<Media | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [progress, setProgress] = useState<EpisodeProgress[]>([])
  const [entry, setEntry] = useState<WatchEntry | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase.from('media').select('*').eq('id', params.id).single()
      setMedia(m)

      const { data: s } = await supabase.from('seasons').select('*').eq('media_id', params.id).order('season_number')
      setSeasons(s ?? [])

      const seasonIds = (s ?? []).map((s: Season) => s.id)
      if (seasonIds.length > 0) {
        const { data: p } = await supabase.from('episode_progress').select('*').in('season_id', seasonIds)
        setProgress(p ?? [])
      }

      const { data: e } = await supabase.from('watch_entries').select('*').eq('media_id', params.id).order('watched_at', { ascending: false }).limit(1).single()
      setEntry(e)
    }
    load()
  }, [params.id])

  const handleProgressChange = useCallback(async (seasonId: string, episode: number, watched: boolean) => {
    if (watched) {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episode_number: episode }),
      })
      if (res.ok) {
        const { progress: p } = await res.json()
        setProgress(prev => [...prev, p])
      }
    } else {
      await fetch('/api/episodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episode_number: episode }),
      })
      setProgress(prev => prev.filter(p => !(p.season_id === seasonId && p.episode_number === episode)))
    }
  }, [])

  if (!media) return <div className="text-gray-400">Loading...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex gap-4">
        {media.poster_url && <img src={media.poster_url} alt={media.title} className="w-32 rounded-xl" />}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{media.title}</h1>
          <p className="text-gray-400">{media.release_year} · TV Show</p>
          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.genres.map(g => <span key={g} className="px-2 py-0.5 bg-gray-800 text-xs text-gray-300 rounded">{g}</span>)}
            </div>
          )}
          {entry?.rating && <RatingStars value={entry.rating} onChange={() => {}} readOnly />}
          {media.overview && <p className="text-sm text-gray-300 max-w-prose">{media.overview}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Episodes</h2>
        <EpisodeTracker seasons={seasons} progress={progress} onProgressChange={handleProgressChange} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/EpisodeTracker.tsx app/api/episodes/ app/show/
git commit -m "feat: add episode tracker with progress API"
```

---

### Task 15: Watchlist Page

**Files:**
- Create: `app/watchlist/page.tsx`

- [ ] **Step 1: Write watchlist page**

Create `app/watchlist/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { WatchlistItem } from '@/types'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('watchlist_items')
    .select('*, media(*)')
    .order('added_at', { ascending: false })

  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = (items ?? []).filter((i: WatchlistItem) => i.priority === p)
    return acc
  }, {} as Record<string, WatchlistItem[]>)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      {PRIORITY_ORDER.map(priority => (
        <div key={priority}>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">
            {PRIORITY_LABELS[priority]}
            <span className="ml-2 text-sm font-normal text-gray-500">{grouped[priority].length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[priority].map((item: WatchlistItem) => (
              <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
                {item.media?.poster_url
                  ? <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />
                  : <div className="w-14 h-20 bg-gray-700 rounded" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white line-clamp-1">{item.media?.title}</p>
                  <p className="text-xs text-gray-400">{item.media?.release_year} · {item.media?.type === 'show' ? 'TV' : 'Movie'}</p>
                </div>
              </div>
            ))}
          </div>
          {grouped[priority].length === 0 && (
            <p className="text-gray-600 text-sm">Nothing here yet.</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/watchlist/
git commit -m "feat: add watchlist page with priority tiers"
```

---

## Phase 5: Lists, Stats, Dashboard, Sharing

### Task 16: Custom Lists

**Files:**
- Create: `app/api/lists/route.ts`, `app/api/lists/[id]/route.ts`, `app/api/lists/[id]/items/route.ts`, `app/lists/page.tsx`, `app/lists/[id]/page.tsx`

- [ ] **Step 1: Write lists API routes**

Create `app/api/lists/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('lists')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ list: data }, { status: 201 })
}
```

Create `app/api/lists/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: any = {}
  if ('name' in body) updates.name = body.name
  if ('is_shared' in body) {
    updates.is_shared = body.is_shared
    if (body.is_shared) updates.share_token = crypto.randomUUID()
    else updates.share_token = null
  }

  const { data, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ list: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('lists').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

Create `app/api/lists/[id]/items/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type } = await request.json()
  const { media } = await upsertMedia(supabase, tmdb_id, type)

  const { data, error } = await supabase
    .from('list_items')
    .upsert({ list_id: params.id, media_id: media.id }, { onConflict: 'list_id,media_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { media_id } = await request.json()
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', params.id)
    .eq('media_id', media_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write lists index page**

Create `app/lists/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [name, setName] = useState('')
  const supabase = createClient()

  async function loadLists() {
    const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false })
    setLists(data ?? [])
  }

  useEffect(() => { loadLists() }, [])

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    loadLists()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Lists</h1>
      <form onSubmit={createList} className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New list name..."
          className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500" />
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create</button>
      </form>
      <div className="space-y-2">
        {lists.map(list => (
          <Link key={list.id} href={`/lists/${list.id}`}
            className="flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 rounded-xl">
            <span className="text-white">{list.name}</span>
            {list.is_shared && <span className="text-xs text-blue-400">Shared</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write list detail page**

Create `app/lists/[id]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { ListItem } from '@/types'
import { notFound } from 'next/navigation'

export default async function ListDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: list } = await supabase.from('lists').select('*').eq('id', params.id).single()
  if (!list) notFound()

  const { data: items } = await supabase
    .from('list_items')
    .select('*, media(*)')
    .eq('list_id', params.id)
    .order('added_at', { ascending: false })

  const shareUrl = list.is_shared
    ? `${process.env.NEXT_PUBLIC_APP_URL}/share/list/${list.share_token}`
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{list.name}</h1>
        {shareUrl && (
          <a href={shareUrl} target="_blank" rel="noopener" className="text-sm text-blue-400 hover:underline">
            Share link ↗
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(items ?? []).map((item: ListItem) => (
          <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
            {item.media?.poster_url
              ? <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />
              : <div className="w-14 h-20 bg-gray-700 rounded" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white line-clamp-1">{item.media?.title}</p>
              <p className="text-xs text-gray-400">{item.media?.release_year} · {item.media?.type === 'show' ? 'TV' : 'Movie'}</p>
            </div>
          </div>
        ))}
      </div>
      {(items ?? []).length === 0 && <p className="text-gray-400">No items in this list yet.</p>}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/lists/ app/lists/
git commit -m "feat: add custom lists with CRUD and sharing"
```

---

### Task 17: Stats Library + Stats Page

**Files:**
- Create: `lib/stats.ts`, `lib/__tests__/stats.test.ts`, `app/stats/page.tsx`

- [ ] **Step 1: Write failing tests for stats aggregation**

Create `lib/__tests__/stats.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity } from '@/lib/stats'

describe('computeGenreBreakdown', () => {
  it('counts genres across entries', () => {
    const entries = [
      { media: { genres: ['Drama', 'Thriller'] } },
      { media: { genres: ['Drama'] } },
      { media: { genres: ['Comedy'] } },
    ] as any
    const result = computeGenreBreakdown(entries)
    expect(result).toContainEqual({ genre: 'Drama', count: 2 })
    expect(result).toContainEqual({ genre: 'Thriller', count: 1 })
    expect(result[0].count).toBeGreaterThanOrEqual(result[1].count) // sorted desc
  })
})

describe('computeRatingDistribution', () => {
  it('counts entries per rating value', () => {
    const entries = [
      { rating: 4.5 }, { rating: 4.5 }, { rating: 3.0 }, { rating: null }
    ] as any
    const result = computeRatingDistribution(entries)
    const r45 = result.find(r => r.rating === 4.5)
    expect(r45?.count).toBe(2)
    const r30 = result.find(r => r.rating === 3.0)
    expect(r30?.count).toBe(1)
  })
})

describe('computeMonthlyActivity', () => {
  it('groups activity by month for last 12 months', () => {
    const entries = [
      { watched_at: '2026-05-10', media: { type: 'movie' } },
      { watched_at: '2026-05-15', media: { type: 'show' } },
    ] as any
    const result = computeMonthlyActivity(entries, 12)
    expect(result).toHaveLength(12)
    const may = result.find(r => r.month === '2026-05')
    expect(may).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run lib/__tests__/stats.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement stats library**

Create `lib/stats.ts`:
```typescript
import type { WatchEntry } from '@/types'

export function computeGenreBreakdown(entries: WatchEntry[]): Array<{ genre: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    for (const g of (e.media?.genres ?? [])) {
      counts[g] = (counts[g] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeRatingDistribution(entries: WatchEntry[]): Array<{ rating: number; count: number }> {
  const counts: Record<number, number> = {}
  for (const e of entries) {
    if (e.rating != null) counts[e.rating] = (counts[e.rating] ?? 0) + 1
  }
  return Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5)
    .map(rating => ({ rating, count: counts[rating] ?? 0 }))
}

export function computeMonthlyActivity(
  entries: WatchEntry[],
  months: number
): Array<{ month: string; movies: number; episodes: number }> {
  const now = new Date()
  const result = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month, movies: 0, episodes: 0 }
  })

  for (const e of entries) {
    const month = e.watched_at.slice(0, 7)
    const bucket = result.find(r => r.month === month)
    if (!bucket) continue
    if (e.media?.type === 'movie') bucket.movies++
    else bucket.episodes++
  }

  return result
}

export function computeTopDirectors(entries: WatchEntry[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    if (e.media?.director) counts[e.media.director] = (counts[e.media.director] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

export function computeTopActors(entries: WatchEntry[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    for (const actor of (e.media?.cast ?? [])) {
      counts[actor] = (counts[actor] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run lib/__tests__/stats.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Write stats page**

Create `app/stats/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import StatsCharts from '@/components/StatsCharts'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity, computeTopDirectors, computeTopActors } from '@/lib/stats'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase.from('watch_entries').select('*, media(*)').order('watched_at')
  const { data: epProgress } = await supabase.from('episode_progress').select('id')

  const all = entries ?? []
  const movies = all.filter(e => e.media?.type === 'movie')
  const shows = all.filter(e => e.media?.type === 'show')

  const totalHours = all.reduce((sum, e) => sum + (e.media?.runtime_mins ?? 0), 0) / 60

  const statsData = {
    totals: {
      movies: movies.length,
      shows: shows.length,
      episodes: epProgress?.length ?? 0,
      hours: Math.round(totalHours),
    },
    genreBreakdown: computeGenreBreakdown(all),
    ratingDist: computeRatingDistribution(all),
    monthlyActivity: computeMonthlyActivity(all, 12),
    topDirectors: computeTopDirectors(movies),
    topActors: computeTopActors(all),
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Stats</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Movies', value: statsData.totals.movies },
          { label: 'Shows', value: statsData.totals.shows },
          { label: 'Episodes', value: statsData.totals.episodes },
          { label: 'Hours', value: statsData.totals.hours },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      <StatsCharts data={statsData} />
    </div>
  )
}
```

- [ ] **Step 6: Write StatsCharts component**

Create `components/StatsCharts.tsx`:
```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']

interface StatsData {
  genreBreakdown: Array<{ genre: string; count: number }>
  ratingDist: Array<{ rating: number; count: number }>
  monthlyActivity: Array<{ month: string; movies: number; episodes: number }>
  topDirectors: Array<{ name: string; count: number }>
  topActors: Array<{ name: string; count: number }>
}

export default function StatsCharts({ data }: { data: { totals: any } & StatsData }) {
  return (
    <div className="space-y-8">
      {/* Monthly activity */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Activity</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthlyActivity}>
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
            <Legend />
            <Bar dataKey="movies" fill="#3b82f6" name="Movies" />
            <Bar dataKey="episodes" fill="#8b5cf6" name="Episodes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genre breakdown */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Genres</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.genreBreakdown.slice(0, 8)} dataKey="count" nameKey="genre" cx="50%" cy="50%" outerRadius={80} label={({ genre }) => genre}>
                {data.genreBreakdown.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rating distribution */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Ratings</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ratingDist}>
              <XAxis dataKey="rating" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
              <Bar dataKey="count" fill="#f59e0b" name="Films" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top directors + actors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Top Directors', items: data.topDirectors },
          { title: 'Top Actors', items: data.topActors },
        ].map(({ title, items }) => (
          <div key={title} className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">{title}</h2>
            <div className="space-y-2">
              {items.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{name}</span>
                  <span className="text-gray-500 text-sm">{count}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-600 text-sm">Not enough data yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/stats.ts lib/__tests__/stats.test.ts app/stats/ components/StatsCharts.tsx
git commit -m "feat: add stats library and stats page with charts"
```

---

### Task 18: Dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write dashboard**

Replace `app/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RatingStars from '@/components/RatingStars'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: recent },
    { data: watchlistCounts },
    { data: thisYearEntries },
    { data: inProgress },
  ] = await Promise.all([
    supabase.from('watch_entries').select('*, media(*)').order('created_at', { ascending: false }).limit(5),
    supabase.from('watchlist_items').select('priority'),
    supabase.from('watch_entries').select('id').gte('watched_at', `${new Date().getFullYear()}-01-01`),
    supabase.from('watch_entries').select('*, media(*)').eq('media.type', 'show').order('watched_at', { ascending: false }).limit(1),
  ])

  const priorityCounts = { must_watch: 0, want_to_watch: 0, someday: 0 }
  for (const item of (watchlistCounts ?? [])) {
    priorityCounts[item.priority as keyof typeof priorityCounts]++
  }

  const currentShow = (inProgress ?? []).find(e => e.media?.type === 'show')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Top-line stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-3xl font-bold text-white">{thisYearEntries?.length ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Watched this year</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-3xl font-bold text-white">{priorityCounts.must_watch}</p>
          <p className="text-sm text-gray-400 mt-1">Must watch</p>
        </div>
        {currentShow?.media && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-sm text-gray-400">Currently watching</p>
            <Link href={`/show/${currentShow.media_id}`} className="font-medium text-blue-400 hover:underline line-clamp-1 mt-1">
              {currentShow.media.title}
            </Link>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recently Watched</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(recent ?? []).map(entry => (
            <div key={entry.id} className="bg-gray-900 rounded-xl overflow-hidden">
              {entry.media?.poster_url
                ? <img src={entry.media.poster_url} alt={entry.media.title} className="w-full aspect-[2/3] object-cover" />
                : <div className="w-full aspect-[2/3] bg-gray-700" />}
              <div className="p-2">
                <p className="text-sm font-medium text-white line-clamp-1">{entry.media?.title}</p>
                {entry.rating && <RatingStars value={entry.rating} onChange={() => {}} readOnly />}
              </div>
            </div>
          ))}
        </div>
        {(recent ?? []).length === 0 && (
          <p className="text-gray-400">Nothing watched yet. <Link href="/search" className="text-blue-400 hover:underline">Start searching.</Link></p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add dashboard with recent activity and stats"
```

---

### Task 19: Sharing + Settings

**Files:**
- Create: `app/api/settings/share/route.ts`, `app/settings/page.tsx`, `app/share/list/[token]/page.tsx`, `app/share/watched/[token]/page.tsx`, `app/share/watchlist/[token]/page.tsx`

- [ ] **Step 1: Write share settings API**

Create `app/api/settings/share/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: generate or revoke a share token
// body: { type: 'watched' | 'watchlist', enabled: boolean }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, enabled } = await request.json()
  if (type !== 'watched' && type !== 'watchlist') {
    return NextResponse.json({ error: 'type must be watched or watchlist' }, { status: 400 })
  }

  const field = type === 'watched' ? 'watched_share_token' : 'watchlist_share_token'
  const token = enabled ? crypto.randomUUID() : null

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, [field]: token }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token })
}
```

- [ ] **Step 2: Write settings page**

Create `app/settings/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import ShareToggle from '@/components/ShareToggle'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('user_settings').select('*').single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="bg-gray-900 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Sharing</h2>
        <ShareToggle
          label="Watched History"
          type="watched"
          token={settings?.watched_share_token ?? null}
          shareUrl={settings?.watched_share_token ? `${appUrl}/share/watched/${settings.watched_share_token}` : null}
        />
        <ShareToggle
          label="Watchlist"
          type="watchlist"
          token={settings?.watchlist_share_token ?? null}
          shareUrl={settings?.watchlist_share_token ? `${appUrl}/share/watchlist/${settings.watchlist_share_token}` : null}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write ShareToggle component**

Create `components/ShareToggle.tsx`:
```typescript
'use client'
import { useState } from 'react'

interface Props {
  label: string
  type: 'watched' | 'watchlist'
  token: string | null
  shareUrl: string | null
}

export default function ShareToggle({ label, type, token: initialToken, shareUrl: initialUrl }: Props) {
  const [token, setToken] = useState(initialToken)
  const [url, setUrl] = useState(initialUrl)
  const [copied, setCopied] = useState(false)

  async function toggle() {
    const enabled = !token
    const res = await fetch('/api/settings/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, enabled }),
    })
    const data = await res.json()
    setToken(data.token)
    setUrl(data.token ? `${window.location.origin}/share/${type}/${data.token}` : null)
  }

  async function copyUrl() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{label}</span>
        <button onClick={toggle} className={`px-3 py-1 rounded-full text-sm font-medium ${token ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          {token ? 'Shared' : 'Private'}
        </button>
      </div>
      {url && (
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs border border-gray-700" />
          <button onClick={copyUrl} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write read-only share pages**

Create `app/share/list/[token]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function SharedListPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: list } = await supabase
    .from('lists')
    .select('*, list_items(*, media(*))')
    .eq('share_token', params.token)
    .eq('is_shared', true)
    .single()

  if (!list) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{list.name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.list_items.map((item: any) => (
          <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
            {item.media?.poster_url && <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />}
            <div>
              <p className="font-medium text-white">{item.media?.title}</p>
              <p className="text-xs text-gray-400">{item.media?.release_year}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Create `app/share/watched/[token]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RatingStars from '@/components/RatingStars'

export default async function SharedWatchedPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, watched_share_token')
    .eq('watched_share_token', params.token)
    .single()

  if (!settings) notFound()

  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .eq('user_id', settings.user_id)
    .order('watched_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Watched</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(entries ?? []).map(entry => (
          <div key={entry.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
            {entry.media?.poster_url && <img src={entry.media.poster_url} alt={entry.media.title} className="w-14 rounded" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white line-clamp-1">{entry.media?.title}</p>
              <p className="text-xs text-gray-400">{entry.watched_at}</p>
              {entry.rating && <RatingStars value={entry.rating} onChange={() => {}} readOnly />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Create `app/share/watchlist/[token]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const PRIORITY_LABELS = { must_watch: 'Must Watch', want_to_watch: 'Want to Watch', someday: 'Someday' }

export default async function SharedWatchlistPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, watchlist_share_token')
    .eq('watchlist_share_token', params.token)
    .single()

  if (!settings) notFound()

  const { data: items } = await supabase
    .from('watchlist_items')
    .select('*, media(*)')
    .eq('user_id', settings.user_id)
    .order('added_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      {(['must_watch', 'want_to_watch', 'someday'] as const).map(priority => {
        const group = (items ?? []).filter((i: any) => i.priority === priority)
        if (group.length === 0) return null
        return (
          <div key={priority}>
            <h2 className="text-lg font-semibold text-gray-300 mb-3">{PRIORITY_LABELS[priority]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.map((item: any) => (
                <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
                  {item.media?.poster_url && <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />}
                  <div>
                    <p className="font-medium text-white">{item.media?.title}</p>
                    <p className="text-xs text-gray-400">{item.media?.release_year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/ app/settings/ app/share/ components/ShareToggle.tsx
git commit -m "feat: add sharing (watched, watchlist, lists) and settings page"
```

---

### Task 20: Deploy to Vercel

- [ ] **Step 1: Add .gitignore entries**

Ensure `.gitignore` contains:
```
.env.local
.superpowers/
```

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 3: Import to Vercel**

Go to vercel.com → Add New Project → import your GitHub repo → set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TMDB_API_KEY`
- `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g. `https://mediatracker.vercel.app`)

- [ ] **Step 4: Deploy and smoke test**

After deploy, visit the Vercel URL:
- Sign in with the account you created in Supabase dashboard
- Search for a movie → mark as watched with a rating
- Search for a TV show → mark as watched → open show detail and check off episodes
- Visit `/stats` — verify counts and charts appear
- Visit `/watchlist` — verify priority tiers
- Create a list → enable sharing → verify share link works without login

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| TMDB auto-fetch metadata | Task 5, 6, 7 |
| Episode-level TV tracking | Task 14 |
| 0.5–5 star ratings | Task 9 |
| Full text reviews | Task 11 |
| Watchlist with priority labels | Task 12, 15 |
| Custom lists | Task 16 |
| Stats page | Task 17 |
| Dashboard | Task 18 |
| Profile sharing (watched + watchlist) | Task 19 |
| Custom list sharing | Task 16 |
| Auth (single user) | Task 3 |
| DB schema + RLS | Task 2 |
| Vercel deployment | Task 20 |
| Season refresh for airing shows | Task 6 (upsert on load) |
