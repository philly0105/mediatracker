import type { WatchEntry } from '@/types'

export type WatchEntrySort = 'recent' | 'rating' | 'name' | 'releaseDate'

function compareTitle(a: WatchEntry, b: WatchEntry) {
  return (a.media?.title ?? '').localeCompare(b.media?.title ?? '', undefined, {
    sensitivity: 'base',
  })
}

export function sortWatchEntries(entries: WatchEntry[], sortBy: WatchEntrySort) {
  if (sortBy === 'recent') return entries

  return [...entries].sort((a, b) => {
    if (sortBy === 'rating') {
      if (a.rating === null && b.rating === null) return compareTitle(a, b)
      if (a.rating === null) return 1
      if (b.rating === null) return -1
      return b.rating - a.rating || compareTitle(a, b)
    }

    if (sortBy === 'releaseDate') {
      if (a.media?.release_year == null && b.media?.release_year == null) {
        return compareTitle(a, b)
      }
      if (a.media?.release_year == null) return 1
      if (b.media?.release_year == null) return -1
      return (b.media?.release_year ?? 0) - (a.media?.release_year ?? 0) || compareTitle(a, b)
    }

    return compareTitle(a, b)
  })
}
