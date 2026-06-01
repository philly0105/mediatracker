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
