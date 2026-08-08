import type { WatchlistItem, WatchlistPriority } from '@/types'

// "Tonight's Pick" weighting: must-watch is four times as likely as someday and
// twice as likely as want-to-watch, so the picker leans toward what the user
// actually wants to see tonight.
const PRIORITY_WEIGHTS: Record<WatchlistPriority, number> = {
  must_watch: 4,
  want_to_watch: 2,
  someday: 1,
}

// Time budget as a minutes threshold. `any` passes everything, including items
// whose runtime is unknown — a null runtime can't be compared to a threshold.
export function matchesBudget(item: WatchlistItem, budget: string): boolean {
  if (budget === 'any') return true
  const threshold = Number(budget)
  const mins = item.media?.runtime_mins
  return mins != null && mins <= threshold
}

export interface PickTonightOptions {
  budget?: string
  // The id of the current pick, so a reroll never repeats it while another
  // option exists.
  avoidId?: string | null
  // Injectable for tests; defaults to Math.random.
  rng?: () => number
}

export function pickTonight(
  candidates: WatchlistItem[],
  { budget = 'any', avoidId = null, rng = Math.random }: PickTonightOptions = {}
): WatchlistItem | null {
  const pool = candidates.filter((i) => matchesBudget(i, budget))
  if (pool.length === 0) return null
  // Never hand back the same item twice in a row while another option exists.
  const eligible = pool.length > 1 ? pool.filter((i) => i.id !== avoidId) : pool
  if (eligible.length === 0) return pool[0]

  const total = eligible.reduce((sum, i) => sum + PRIORITY_WEIGHTS[i.priority], 0)
  let draw = rng() * total
  for (const item of eligible) {
    draw -= PRIORITY_WEIGHTS[item.priority]
    if (draw < 0) return item
  }
  return eligible[eligible.length - 1]
}