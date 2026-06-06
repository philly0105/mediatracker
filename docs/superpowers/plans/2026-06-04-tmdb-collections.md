# TMDB Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/collections` tab and `/collections/[id]` detail page so users can explore movie franchises, see which ones they're actively watching, and log new movies directly from the collection view.

**Architecture:** Extend the `media` table with `collection_id`/`collection_name` columns so watched movies surface their franchise automatically. Serve user-specific data from a server component and popular collections from a client-side paginated feed (`PopularCollectionsFeed`) backed by a new API route that fans out 3 TMDB pages per batch and returns deduplicated results. A new `CollectionMovieCard` component handles per-film status display without modifying the existing `MediaCard` (which is tightly coupled to `WatchEntry`).

**Tech Stack:** Next.js 16 App Router, Supabase, TMDB API, Framer Motion, Tailwind CSS v4, Vitest

**Audit fixes baked in:**
- Backfill is **required** (not optional) — new users see nothing until it runs
- Cross-page dedup uses a `seenIds: Set<number>` ref that persists across Load More clicks
- Each Load More batch fetches 3 TMDB pages server-side for a meaningful yield
- `parts` array is explicitly sorted by `release_date` in `getCollectionDetails`
- `CollectionMovieCard` is a new component (no `MediaCard` prop surgery needed)
- Empty states and Load More loading state included

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `types/index.ts` | Add `TmdbCollectionSummary`, `TmdbCollectionDetails`, `TmdbCollectionPart`; extend `Media` and `TmdbFullDetails` |
| Create | `supabase/migrations/003_collections.sql` | Add `collection_id` and `collection_name` to `media` table |
| Modify | `lib/tmdb.ts` | Add `getCollectionDetails`, `getPopularCollections`; update `fetchTmdbDetails` to return `belongs_to_collection` |
| Modify | `lib/media.ts` | Save `collection_id`/`collection_name` in `upsertMedia` |
| Modify | `lib/__tests__/tmdb.test.ts` | Tests for new TMDB functions |
| Create | `app/api/admin/backfill-collections/route.ts` | Admin POST: backfills collection data for existing movies |
| Create | `app/api/tmdb/popular-collections/route.ts` | GET: fans out 3 TMDB pages, deduplicates, returns collection list |
| Modify | `components/Sidebar.tsx` | Add Collections nav item |
| Create | `components/CollectionMovieCard.tsx` | Card for collection detail grid; shows watched/watchlisted badges |
| Create | `components/PopularCollectionsFeed.tsx` | Client component with pagination; tracks `seenIds` across batches |
| Create | `app/collections/page.tsx` | Server component: active collections + popular feed |
| Create | `app/collections/[id]/page.tsx` | Server component: hero + movie grid with user status |

---

## Task 1: Update Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add collection types and extend `Media`**

Replace the contents of `types/index.ts` with:

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
  cast_members: string[]
  collection_id: number | null
  collection_name: string | null
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
  genres?: string[]
  vote_average?: number
}

export interface TmdbCollectionSummary {
  id: number
  name: string
  poster_url: string | null
  backdrop_url: string | null
}

export interface TmdbCollectionPart {
  tmdb_id: number
  title: string
  poster_url: string | null
  release_date: string | null
  release_year: number | null
  overview: string
}

export interface TmdbCollectionDetails {
  id: number
  name: string
  overview: string
  poster_url: string | null
  backdrop_url: string | null
  parts: TmdbCollectionPart[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/aideo/mediatracker && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to types/index.ts).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(collections): add collection types and extend Media interface"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/003_collections.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/003_collections.sql
alter table media
  add column collection_id integer,
  add column collection_name text;
```

- [ ] **Step 2: Apply to your Supabase project**

Option A — Supabase CLI:
```bash
npx supabase db push
```

Option B — Supabase Dashboard: navigate to SQL Editor and run the two `ALTER TABLE` statements manually.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_collections.sql
git commit -m "feat(collections): add collection_id and collection_name columns to media"
```

---

## Task 3: TMDB Functions + Tests (TDD)

**Files:**
- Modify: `lib/__tests__/tmdb.test.ts` (write tests first)
- Modify: `lib/tmdb.ts` (implement)

- [ ] **Step 1: Write failing tests**

Append to `lib/__tests__/tmdb.test.ts`:

```typescript
import { getCollectionDetails, getPopularCollections } from '@/lib/tmdb'

describe('fetchTmdbDetails — belongs_to_collection', () => {
  it('includes collection data when movie belongs to a collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [{ name: 'Drama' }], release_date: '1999-10-15',
        belongs_to_collection: { id: 123, name: 'Fight Club Collection' },
        credits: { crew: [], cast: [] },
        videos: { results: [] },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details.belongs_to_collection).toEqual({ id: 123, name: 'Fight Club Collection' })
  })

  it('returns null belongs_to_collection when not in a collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [], release_date: '1999-10-15',
        belongs_to_collection: null,
        credits: { crew: [], cast: [] },
        videos: { results: [] },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details.belongs_to_collection).toBeNull()
  })
})

describe('getCollectionDetails', () => {
  it('returns collection with parts sorted by release_date', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 131635,
        name: 'Lord of the Rings Collection',
        overview: 'Epic fantasy trilogy',
        backdrop_path: '/backdrop.jpg',
        poster_path: '/poster.jpg',
        parts: [
          { id: 122, title: 'The Return of the King', poster_path: '/p3.jpg', release_date: '2003-12-17', overview: 'Third' },
          { id: 120, title: 'The Fellowship of the Ring', poster_path: '/p1.jpg', release_date: '2001-12-10', overview: 'First' },
          { id: 121, title: 'The Two Towers', poster_path: '/p2.jpg', release_date: '2002-12-18', overview: 'Second' },
        ],
      }),
    })
    const result = await getCollectionDetails(131635)
    expect(result.id).toBe(131635)
    expect(result.name).toBe('Lord of the Rings Collection')
    expect(result.backdrop_url).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg')
    expect(result.poster_url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
    expect(result.parts).toHaveLength(3)
    expect(result.parts[0].title).toBe('The Fellowship of the Ring')
    expect(result.parts[0].tmdb_id).toBe(120)
    expect(result.parts[1].title).toBe('The Two Towers')
    expect(result.parts[2].title).toBe('The Return of the King')
    expect(result.parts[0].release_year).toBe(2001)
  })

  it('handles null poster and backdrop paths', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, name: 'Test', overview: '', backdrop_path: null, poster_path: null, parts: [],
      }),
    })
    const result = await getCollectionDetails(1)
    expect(result.backdrop_url).toBeNull()
    expect(result.poster_url).toBeNull()
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(getCollectionDetails(0)).rejects.toThrow('TMDB collection failed: 404')
  })
})

describe('getPopularCollections', () => {
  it('deduplicates collections within a page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: 1, belongs_to_collection: { id: 10, name: 'MCU', poster_path: '/p.jpg', backdrop_path: '/b.jpg' } },
          { id: 2, belongs_to_collection: { id: 10, name: 'MCU', poster_path: '/p.jpg', backdrop_path: '/b.jpg' } },
          { id: 3, belongs_to_collection: { id: 20, name: 'DCEU', poster_path: '/p2.jpg', backdrop_path: '/b2.jpg' } },
          { id: 4, belongs_to_collection: null },
          { id: 5, belongs_to_collection: undefined },
        ],
      }),
    })
    const result = await getPopularCollections(1)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 10, name: 'MCU', poster_url: 'https://image.tmdb.org/t/p/w500/p.jpg', backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg' })
    expect(result[1].id).toBe(20)
  })

  it('returns empty array on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await getPopularCollections(1)
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /c/Users/aideo/mediatracker && npm run test:run -- lib/__tests__/tmdb.test.ts 2>&1 | tail -20
```

Expected: FAIL — `getCollectionDetails is not exported`, `getPopularCollections is not exported`, `belongs_to_collection` tests fail.

- [ ] **Step 3: Implement in `lib/tmdb.ts`**

Add `BACKDROP` constant after `IMG`:

```typescript
const BACKDROP = 'https://image.tmdb.org/t/p/w1280'
```

Update `TmdbFullDetails` interface — add one field at the end:

```typescript
  belongs_to_collection?: { id: number; name: string } | null
```

In the `fetchTmdbDetails` movie branch, add `belongs_to_collection` to the returned object:

```typescript
      belongs_to_collection: d.belongs_to_collection
        ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name }
        : null,
```

Add the two new functions at the end of `lib/tmdb.ts`, after `fetchTmdbTrending`:

```typescript
import type { TmdbCollectionDetails, TmdbCollectionPart, TmdbCollectionSummary } from '@/types'

export async function getCollectionDetails(id: number): Promise<TmdbCollectionDetails> {
  const res = await fetch(apiUrl(`/collection/${id}`))
  if (!res.ok) throw new Error(`TMDB collection failed: ${res.status}`)
  const d = await res.json()

  const parts: TmdbCollectionPart[] = (d.parts ?? [])
    .sort((a: any, b: any) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
    .map((p: any): TmdbCollectionPart => ({
      tmdb_id: p.id,
      title: p.title,
      poster_url: p.poster_path ? `${IMG}${p.poster_path}` : null,
      release_date: p.release_date || null,
      release_year: p.release_date ? parseInt(p.release_date.split('-')[0]) : null,
      overview: p.overview ?? '',
    }))

  return {
    id: d.id,
    name: d.name,
    overview: d.overview ?? '',
    poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `${BACKDROP}${d.backdrop_path}` : null,
    parts,
  }
}

export async function getPopularCollections(page: number): Promise<TmdbCollectionSummary[]> {
  const res = await fetch(apiUrl('/movie/popular', { page: String(page) }))
  if (!res.ok) return []
  const data = await res.json()

  const seen = new Set<number>()
  const collections: TmdbCollectionSummary[] = []

  for (const movie of (data.results ?? [])) {
    const c = movie.belongs_to_collection
    if (!c || seen.has(c.id)) continue
    seen.add(c.id)
    collections.push({
      id: c.id,
      name: c.name,
      poster_url: c.poster_path ? `${IMG}${c.poster_path}` : null,
      backdrop_url: c.backdrop_path ? `${BACKDROP}${c.backdrop_path}` : null,
    })
  }
  return collections
}
```

> **Note:** The import for the three collection types goes at the top of `lib/tmdb.ts`, replacing the existing `import type { TmdbSearchResult, MediaType } from '@/types'` with:
> `import type { TmdbSearchResult, MediaType, TmdbCollectionDetails, TmdbCollectionPart, TmdbCollectionSummary } from '@/types'`

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /c/Users/aideo/mediatracker && npm run test:run -- lib/__tests__/tmdb.test.ts 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb.ts lib/__tests__/tmdb.test.ts
git commit -m "feat(collections): add getCollectionDetails, getPopularCollections, and belongs_to_collection to fetchTmdbDetails"
```

---

## Task 4: Update `upsertMedia` to Save Collection Data

**Files:**
- Modify: `lib/media.ts`

- [ ] **Step 1: Update `mediaRow` in `upsertMedia`**

In `lib/media.ts`, replace the `mediaRow` object:

```typescript
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
    cast_members: details.cast_members,
    collection_id: details.type === 'movie' ? (details.belongs_to_collection?.id ?? null) : null,
    collection_name: details.type === 'movie' ? (details.belongs_to_collection?.name ?? null) : null,
  }
```

- [ ] **Step 2: Run all tests**

```bash
cd /c/Users/aideo/mediatracker && npm run test:run 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/media.ts
git commit -m "feat(collections): persist collection_id and collection_name when upserting movies"
```

---

## Task 5: Backfill Admin Route

This route re-fetches TMDB details for existing movies that haven't been assigned a collection, populating `collection_id`/`collection_name`. It processes up to 100 movies per call (to avoid serverless timeouts) and is protected by `ADMIN_SECRET`.

**Files:**
- Create: `app/api/admin/backfill-collections/route.ts`

- [ ] **Step 1: Add `ADMIN_SECRET` to your environment**

In your Supabase project's environment variables (or `.env.local` for local dev), add:
```
ADMIN_SECRET=<some-long-random-string>
```

Also add it to Vercel's environment variables via the dashboard or `vercel env add ADMIN_SECRET`.

- [ ] **Step 2: Create the route**

```typescript
// app/api/admin/backfill-collections/route.ts
import { createClient } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: movies, error } = await supabase
    .from('media')
    .select('id, tmdb_id')
    .eq('type', 'movie')
    .is('collection_id', null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  const errors: string[] = []

  for (const movie of (movies ?? [])) {
    try {
      const details = await fetchTmdbDetails(movie.tmdb_id, 'movie')
      await supabase
        .from('media')
        .update({
          collection_id: details.belongs_to_collection?.id ?? null,
          collection_name: details.belongs_to_collection?.name ?? null,
        })
        .eq('id', movie.id)
      if (details.belongs_to_collection) updated++
    } catch (err: any) {
      errors.push(`tmdb_id=${movie.tmdb_id}: ${err.message}`)
    }
  }

  return NextResponse.json({
    processed: movies?.length ?? 0,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  })
}
```

- [ ] **Step 3: Run the backfill (once, after deploying)**

```bash
curl -X POST https://<your-vercel-url>/api/admin/backfill-collections \
  -H "Authorization: Bearer <ADMIN_SECRET>"
```

Or locally:
```bash
curl -X POST http://localhost:3000/api/admin/backfill-collections \
  -H "Authorization: Bearer <ADMIN_SECRET>"
```

Expected response: `{ "processed": N, "updated": M }`. If N > 0, run again until `processed: 0` (all movies have been checked).

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/backfill-collections/route.ts
git commit -m "feat(collections): add admin backfill route for collection_id on existing movies"
```

---

## Task 6: Popular Collections API Route

**Files:**
- Create: `app/api/tmdb/popular-collections/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/tmdb/popular-collections/route.ts
import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { TmdbCollectionSummary } from '@/types'

export async function GET(req: NextRequest) {
  const batch = Math.max(1, parseInt(req.nextUrl.searchParams.get('batch') ?? '1'))
  const startPage = (batch - 1) * 3 + 1

  const [p1, p2, p3] = await Promise.all([
    getPopularCollections(startPage),
    getPopularCollections(startPage + 1),
    getPopularCollections(startPage + 2),
  ])

  const seen = new Set<number>()
  const merged: TmdbCollectionSummary[] = []

  for (const c of [...p1, ...p2, ...p3]) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    merged.push(c)
  }

  return NextResponse.json({ collections: merged })
}
```

- [ ] **Step 2: Test manually**

Start the dev server (`npm run dev`) and visit:
```
http://localhost:3000/api/tmdb/popular-collections?batch=1
```

Expected: JSON with `{ "collections": [...] }` containing ~10–20 unique collection objects, each with `id`, `name`, `poster_url`, `backdrop_url`.

- [ ] **Step 3: Commit**

```bash
git add app/api/tmdb/popular-collections/route.ts
git commit -m "feat(collections): add popular-collections API route with 3-page batching and dedup"
```

---

## Task 7: Add Collections to Sidebar

**Files:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 1: Add the Library icon import**

In `components/Sidebar.tsx`, add `Library` to the lucide-react import:

```typescript
import {
  Home,
  Search,
  Film,
  Tv,
  ListTodo,
  Library,
  Layers,
  BarChart3,
  Upload,
  Settings,
  User,
  Sparkles,
  Calendar,
  Swords
} from 'lucide-react'
```

- [ ] **Step 2: Add Collections to navItems**

In the `navItems` array, insert Collections after Watchlist:

```typescript
  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Movies', href: '/movies', icon: Film },
    { name: 'Shows', href: '/shows', icon: Tv },
    { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
    { name: 'Collections', href: '/collections', icon: Library },
    { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
    { name: 'Versus', href: '/versus', icon: Swords },
    { name: 'Lists', href: '/lists', icon: Layers },
    { name: 'Stats', href: '/stats', icon: BarChart3 },
    { name: 'Import', href: '/import', icon: Upload },
  ]
```

- [ ] **Step 3: Run all tests**

```bash
cd /c/Users/aideo/mediatracker && npm run test:run 2>&1 | tail -5
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat(collections): add Collections link to sidebar nav"
```

---

## Task 8: `CollectionMovieCard` Component

**Files:**
- Create: `components/CollectionMovieCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/CollectionMovieCard.tsx
'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, BookmarkCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import type { TmdbCollectionPart, TmdbSearchResult } from '@/types'

interface Props {
  part: TmdbCollectionPart
  isWatched: boolean
  isWatchlisted: boolean
}

export default function CollectionMovieCard({ part, isWatched, isWatchlisted }: Props) {
  const [showInfo, setShowInfo] = useState(false)
  const router = useRouter()

  const item: TmdbSearchResult = {
    tmdb_id: part.tmdb_id,
    type: 'movie',
    title: part.title,
    overview: part.overview,
    poster_url: part.poster_url,
    release_year: part.release_year,
  }

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.015, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="glass-card rounded-2xl overflow-hidden cursor-pointer relative select-none"
        onClick={() => setShowInfo(true)}
      >
        <div className="relative aspect-[2/3]">
          {part.poster_url ? (
            <img
              src={part.poster_url}
              alt={part.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xs text-zinc-600">No Poster</span>
            </div>
          )}
          {(isWatched || isWatchlisted) && (
            <div className="absolute top-2 right-2">
              {isWatched ? (
                <div className="bg-black/60 rounded-full p-0.5">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                </div>
              ) : (
                <div className="bg-black/60 rounded-full p-0.5">
                  <BookmarkCheck className="w-4 h-4 text-orange-400" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-white text-sm line-clamp-2 leading-snug">{part.title}</p>
          {part.release_year && (
            <p className="text-xs text-zinc-500 mt-0.5">{part.release_year}</p>
          )}
        </div>
      </motion.div>

      {showInfo && createPortal(
        <MediaInfoModal
          item={item}
          onClose={() => setShowInfo(false)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: part.tmdb_id, type: 'movie', priority: 'want_to_watch' }),
            })
            setShowInfo(false)
            router.refresh()
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tmdb_id: part.tmdb_id,
                type: 'movie',
                watched_at: new Date().toISOString().split('T')[0],
              }),
            })
            setShowInfo(false)
            router.refresh()
          }}
        />,
        document.body
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CollectionMovieCard.tsx
git commit -m "feat(collections): add CollectionMovieCard component with watched/watchlisted badges"
```

---

## Task 9: `PopularCollectionsFeed` Component

**Files:**
- Create: `components/PopularCollectionsFeed.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/PopularCollectionsFeed.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { TmdbCollectionSummary } from '@/types'

export default function PopularCollectionsFeed() {
  const [collections, setCollections] = useState<TmdbCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [batch, setBatch] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const seenIds = useRef(new Set<number>())

  async function fetchBatch(batchNum: number, isLoadMore = false) {
    isLoadMore ? setLoadingMore(true) : setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/popular-collections?batch=${batchNum}`)
      if (!res.ok) return
      const data = await res.json()
      const fresh = (data.collections as TmdbCollectionSummary[]).filter(c => {
        if (seenIds.current.has(c.id)) return false
        seenIds.current.add(c.id)
        return true
      })
      if (fresh.length === 0) setHasMore(false)
      setCollections(prev => isLoadMore ? [...prev, ...fresh] : fresh)
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => { fetchBatch(1) }, [])

  function handleLoadMore() {
    const next = batch + 1
    setBatch(next)
    fetchBatch(next, true)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="glass-card rounded-2xl aspect-video animate-pulse bg-white/5" />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return <p className="text-zinc-500 text-sm italic pl-1">No popular collections found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {collections.map(c => (
          <Link key={c.id} href={`/collections/${c.id}`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="glass-card rounded-2xl overflow-hidden cursor-pointer"
            >
              <div className="relative aspect-video">
                {c.backdrop_url ? (
                  <img src={c.backdrop_url} alt={c.name} className="w-full h-full object-cover" />
                ) : c.poster_url ? (
                  <img src={c.poster_url} alt={c.name} className="w-full h-full object-contain bg-zinc-900" />
                ) : (
                  <div className="w-full h-full bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-3 right-3 text-white text-sm font-bold line-clamp-2 leading-snug drop-shadow-md">
                  {c.name}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PopularCollectionsFeed.tsx
git commit -m "feat(collections): add PopularCollectionsFeed with batched pagination and cross-page dedup"
```

---

## Task 10: Collections Index Page

**Files:**
- Create: `app/collections/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/collections/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, Library } from 'lucide-react'
import PopularCollectionsFeed from '@/components/PopularCollectionsFeed'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('watch_entries')
    .select('media(collection_id, collection_name, poster_url)')
    .eq('user_id', user.id)

  const collectionMap = new Map<number, { id: number; name: string; poster_url: string | null; count: number }>()
  for (const entry of (entries ?? [])) {
    const media = (entry as any).media
    if (!media?.collection_id) continue
    const existing = collectionMap.get(media.collection_id)
    if (existing) {
      existing.count++
    } else {
      collectionMap.set(media.collection_id, {
        id: media.collection_id,
        name: media.collection_name ?? 'Unknown Collection',
        poster_url: media.poster_url,
        count: 1,
      })
    }
  }
  const activeCollections = Array.from(collectionMap.values())

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Collections
        </h1>
        <p className="text-sm text-zinc-400">
          Explore movie franchises and series.
        </p>
      </div>

      {/* Your Active Collections */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
          <div className="p-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5">
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Your Active Collections</h2>
          {activeCollections.length > 0 && (
            <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {activeCollections.length}
            </span>
          )}
        </div>

        {activeCollections.length === 0 ? (
          <p className="text-zinc-500 text-sm italic pl-1">
            No collections yet. Log franchise movies to discover your series.{' '}
            <Link
              href="/search"
              className="text-violet-400 hover:text-violet-300 transition-colors not-italic underline underline-offset-2"
            >
              Search to add one.
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCollections.map(c => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <div className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                  {c.poster_url ? (
                    <img
                      src={c.poster_url}
                      alt={c.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-zinc-900 flex items-center justify-center">
                      <Library className="w-8 h-8 text-zinc-700" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold text-white text-sm line-clamp-2 leading-snug">{c.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{c.count} watched</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular Collections */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold tracking-tight text-white">Popular Collections</h2>
        </div>
        <PopularCollectionsFeed />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /c/Users/aideo/mediatracker && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add app/collections/page.tsx
git commit -m "feat(collections): add /collections page with active collections and popular feed"
```

---

## Task 11: Collection Detail Page

**Files:**
- Create: `app/collections/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/collections/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCollectionDetails } from '@/lib/tmdb'
import CollectionMovieCard from '@/components/CollectionMovieCard'

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collectionId = parseInt(id)
  if (isNaN(collectionId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let collection
  try {
    collection = await getCollectionDetails(collectionId)
  } catch {
    notFound()
  }

  const tmdbIds = collection.parts.map(p => p.tmdb_id)

  // Look up internal media UUIDs for the collection's TMDB IDs
  const { data: mediaRows } = tmdbIds.length > 0
    ? await supabase.from('media').select('id, tmdb_id').in('tmdb_id', tmdbIds)
    : { data: [] }

  const tmdbIdToMediaId = new Map((mediaRows ?? []).map(m => [m.tmdb_id as number, m.id as string]))
  const mediaIds = Array.from(tmdbIdToMediaId.values())

  const [{ data: watched }, { data: watchlisted }] = mediaIds.length > 0
    ? await Promise.all([
        supabase.from('watch_entries').select('media_id').eq('user_id', user.id).in('media_id', mediaIds),
        supabase.from('watchlist_items').select('media_id').eq('user_id', user.id).in('media_id', mediaIds),
      ])
    : [{ data: [] }, { data: [] }]

  const watchedMediaIds = new Set((watched ?? []).map(w => w.media_id))
  const watchlistedMediaIds = new Set((watchlisted ?? []).map(w => w.media_id))

  const watchedCount = collection.parts.filter(p => {
    const mediaId = tmdbIdToMediaId.get(p.tmdb_id)
    return mediaId !== undefined && watchedMediaIds.has(mediaId)
  }).length

  return (
    <div className="space-y-8">
      <Link
        href="/collections"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Collections
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        {collection.backdrop_url ? (
          <img
            src={collection.backdrop_url}
            alt={collection.name}
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4">
          {collection.poster_url && (
            <img
              src={collection.poster_url}
              alt={collection.name}
              className="hidden sm:block w-20 rounded-xl border border-white/10 shadow-lg shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {collection.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {watchedCount} of {collection.parts.length} watched
            </p>
          </div>
        </div>
      </div>

      {collection.overview && (
        <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">{collection.overview}</p>
      )}

      {/* Movie grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {collection.parts.map(part => {
          const mediaId = tmdbIdToMediaId.get(part.tmdb_id)
          return (
            <CollectionMovieCard
              key={part.tmdb_id}
              part={part}
              isWatched={mediaId !== undefined && watchedMediaIds.has(mediaId)}
              isWatchlisted={mediaId !== undefined && watchlistedMediaIds.has(mediaId)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify full TypeScript build**

```bash
cd /c/Users/aideo/mediatracker && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd /c/Users/aideo/mediatracker && npm run test:run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/collections/[id]/page.tsx
git commit -m "feat(collections): add /collections/[id] detail page with hero, progress, and movie grid"
```

---

## Task 12: Smoke Test End-to-End

- [ ] **Start dev server**

```bash
cd /c/Users/aideo/mediatracker && npm run dev
```

- [ ] **Check sidebar** — Collections link appears between Watchlist and Recommendations, highlights on active route.

- [ ] **Check `/collections`** — Page loads. "Your Active Collections" shows either your franchise movies or the empty-state message. "Popular Collections" grid loads with backdrop images and a "Show More" button.

- [ ] **Check "Show More"** — Click 2–3 times; new collections append, no duplicates visible, button shows a spinner while loading.

- [ ] **Check `/collections/[id]`** — Click any collection. Hero image + title + "X of Y watched" stat renders. Movie grid shows all films in chronological order. Watched films show a violet checkmark; watchlisted films show an orange bookmark.

- [ ] **Check logging** — Click an unwatched movie card in a collection → `MediaInfoModal` opens → click "Mark as Watched" → page refreshes and card now shows the violet checkmark.

- [ ] **Commit final**

```bash
git add .
git commit -m "feat(collections): complete TMDB Collections feature" --allow-empty
```
