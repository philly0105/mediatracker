'use client'

// The ⌘K palette's recent-query memory.
//
// Recorded when a search is *acted on* — a title opened, a person visited — not
// on every keystroke. Recording as you type fills the list with the prefixes of
// one search ("b", "br", "bre", …) and buries the thing you actually looked up.

const KEY = 'dorfmovies:recent-searches'
export const MAX_RECENT_SEARCHES = 6

/** Reads are best-effort: Safari private mode throws on localStorage access. */
export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT_SEARCHES)
  } catch {
    return []
  }
}

/**
 * Puts `query` at the front, dropping any earlier copy so re-running a search
 * moves it up rather than duplicating it. Returns the new list so the caller can
 * render it without a second read.
 */
export function recordRecentSearch(query: string): string[] {
  const trimmed = query.trim()
  if (typeof window === 'undefined' || trimmed.length < 2) return readRecentSearches()

  const next = [trimmed, ...readRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase())]
    .slice(0, MAX_RECENT_SEARCHES)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked — the in-memory list the caller renders is still
    // correct for this session.
  }
  return next
}

export function clearRecentSearches(): string[] {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing to do
  }
  return []
}
