import type { WatchEntry } from '@/types'

// List of active filters for the library. `null` / `false` means "no filter".
export interface LibraryFilters {
  // 'All' is represented as null
  genre: string | null
  // At-or-above rating threshold (0.5–5.0 scale). null disables the rating gate.
  minRating: number | null
  // When true, only entries with no rating are kept.
  unratedOnly: boolean
  // Decade start year, e.g. 2020 for the 2020s. null disables the gate.
  decade: number | null
}

// Pure filter over the fully-loaded library. Composes with the text search
// (matchesLibraryQuery) and the sort in the component — every filter ANDs
// together, and a default filter set is a no-op returning everything.
export function filterLibraryEntries(
  entries: WatchEntry[],
  filters: LibraryFilters
): WatchEntry[] {
  return entries.filter((entry) => {
    if (filters.genre && !entry.media?.genres?.includes(filters.genre)) return false

    if (filters.unratedOnly) {
      if (entry.rating != null) return false
    } else if (filters.minRating != null) {
      if (entry.rating == null || entry.rating < filters.minRating) return false
    }

    if (filters.decade != null) {
      const year = entry.media?.release_year
      if (year == null) return false
      if (Math.floor(year / 10) * 10 !== filters.decade) return false
    }

    return true
  })
}

// Genres actually present in the loaded entries, alphabetical, deduped.
export function distinctGenres(entries: WatchEntry[]): string[] {
  const set = new Set<string>()
  for (const entry of entries) {
    for (const genre of entry.media?.genres ?? []) {
      if (genre) set.add(genre)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

// Decades actually present (from release_year), newest first.
export function distinctDecades(entries: WatchEntry[]): number[] {
  const set = new Set<number>()
  for (const entry of entries) {
    const year = entry.media?.release_year
    if (year == null) continue
    set.add(Math.floor(year / 10) * 10)
  }
  return [...set].sort((a, b) => b - a)
}

// Flatten/dedupe the genre facet rows returned by GET /api/watchlist?facets=1
// (each row's media.genres is a Postgres text[]). Kept pure so it is testable
// without a live database.
export function collectGenres(
  rows: Array<{ media?: { genres?: string[] | null } | null } | null>
): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    for (const genre of row?.media?.genres ?? []) {
      if (genre) set.add(genre)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}