import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import HomeStatsPanel, { loadYearStats, type YearStats } from '@/components/home/HomeStatsPanel'

type Read = { rows?: unknown[]; error?: string }

function fakeSupabase(reads: { watch_entries?: Read; episode_progress?: Read }) {
  return {
    from: (table: keyof typeof reads) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        range: () => builder,
        then: (resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) => {
          const read = reads[table] ?? {}
          resolve(read.error
            ? { data: null, error: { message: read.error } }
            : { data: read.rows ?? [], error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
}

const NOW = new Date(2026, 5, 14)

async function renderPanel(stats: YearStats) {
  // A server component: call it, then render what it returned.
  const tree = await HomeStatsPanel({ stats: Promise.resolve(stats), inProgress: 2, mustWatch: 3, now: NOW })
  return render(tree)
}

describe('loadYearStats', () => {
  it('never rejects, so a failed read cannot take the dashboard down', async () => {
    const stats = loadYearStats(fakeSupabase({ watch_entries: { error: 'connection reset' } }), 'u1', 2026)
    await expect(stats).resolves.toBeTruthy()
  })

  it('reports a failed read instead of passing it off as an empty year', async () => {
    const stats = await loadYearStats(fakeSupabase({ watch_entries: { error: 'connection reset' } }), 'u1', 2026)
    expect(stats.failed).toBe(true)
    expect(stats.entries).toEqual([])
  })

  it('is not marked failed when the year really is empty', async () => {
    const stats = await loadYearStats(fakeSupabase({}), 'u1', 2026)
    expect(stats).toMatchObject({ failed: false, truncated: false, entries: [], episodes: [] })
  })
})

describe('HomeStatsPanel', () => {
  it('says the numbers did not load rather than showing a year of zeros', async () => {
    await renderPanel({ entries: [], episodes: [], failed: true, truncated: false })

    expect(screen.getByText("This year's numbers didn't load")).toBeInTheDocument()
    // The panel keeps its heading and its way out; what it must not do is
    // claim the user logged nothing this year.
    expect(screen.getByText('2026 so far')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /All stats/ })).toBeInTheDocument()
    expect(screen.queryByText('Titles logged')).not.toBeInTheDocument()
  })

  it('says so when the year ran past the paging ceiling', async () => {
    await renderPanel({ entries: [], episodes: [], failed: false, truncated: true })
    expect(screen.getByText(/these cover part of it/)).toBeInTheDocument()
  })

  it('shows the tiles and no notice on a clean read', async () => {
    await renderPanel({ entries: [], episodes: [], failed: false, truncated: false })

    expect(screen.getByText('Titles logged')).toBeInTheDocument()
    expect(screen.queryByText("This year's numbers didn't load")).not.toBeInTheDocument()
    expect(screen.queryByText(/these cover part of it/)).not.toBeInTheDocument()
  })
})
