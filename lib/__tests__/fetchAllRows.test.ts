import { describe, it, expect } from 'vitest'
import { fetchAllRowsConcurrent } from '@/lib/fetchAllRows'

type Call = { from: number; to: number; withCount: boolean }

// A table PostgREST-style: a window returns at most `pageSize` rows, and the
// first request can carry an exact count. `delay` lets a test resolve windows
// out of order, which is exactly when stitching them back by position matters.
function table(total: number, opts: { count?: boolean; failFrom?: number; delay?: (from: number) => number } = {}) {
  const rows = Array.from({ length: total }, (_, i) => i)
  const calls: Call[] = []
  let inFlight = 0
  let peak = 0
  const build = (from: number, to: number, withCount: boolean) => {
    calls.push({ from, to, withCount })
    inFlight++
    peak = Math.max(peak, inFlight)
    return new Promise<{ data: number[] | null; error: { message: string } | null; count?: number | null }>((resolve) => {
      setTimeout(() => {
        inFlight--
        if (opts.failFrom !== undefined && from === opts.failFrom) {
          resolve({ data: null, error: { message: `window ${from} failed` } })
          return
        }
        resolve({
          data: rows.slice(from, to + 1),
          error: null,
          count: withCount && opts.count !== false ? total : undefined,
        })
      }, opts.delay?.(from) ?? 0)
    })
  }
  return { build, calls, peak: () => peak }
}

describe('fetchAllRowsConcurrent', () => {
  it('reads a library under one page in a single request, as before', async () => {
    const t = table(640)
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })

    expect(result).toEqual({ rows: Array.from({ length: 640 }, (_, i) => i), error: null, truncated: false })
    expect(t.calls).toEqual([{ from: 0, to: 999, withCount: true }])
  })

  it('fetches the remaining windows from the count, and keeps their order', async () => {
    // Later windows resolve first, so a stitch by arrival would scramble rows.
    const t = table(2500, { delay: (from) => (from === 1000 ? 30 : 0) })
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })

    expect(result.rows).toEqual(Array.from({ length: 2500 }, (_, i) => i))
    expect(result.error).toBeNull()
    expect(t.calls.map((c) => c.from)).toEqual([0, 1000, 2000])
    expect(t.calls.filter((c) => c.withCount)).toHaveLength(1)
  })

  it('leaves room for a row inserted after the count when the total sits on a page boundary', async () => {
    const t = table(2000)
    await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })
    expect(t.calls.map((c) => c.from)).toEqual([0, 1000, 2000])
  })

  it('keeps no more than four later windows in flight', async () => {
    const t = table(12_000, { delay: () => 5 })
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })

    expect(result.rows).toHaveLength(12_000)
    // The first request runs alone, so the peak is the pool's limit.
    expect(t.peak()).toBe(4)
  })

  it('reports a failed later window rather than returning a short answer as whole', async () => {
    const t = table(3000, { failFrom: 2000 })
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })
    expect(result.error).toBe('window 2000 failed')
  })

  it('reports a failed first window', async () => {
    const t = table(3000, { failFrom: 0 })
    expect(await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })).toEqual({
      rows: [],
      error: 'window 0 failed',
      truncated: false,
    })
  })

  it('walks the rest in sequence when the response carries no count', async () => {
    const t = table(2500, { count: false })
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000 })
    expect(result.rows).toEqual(Array.from({ length: 2500 }, (_, i) => i))
    expect(t.calls.map((c) => c.from)).toEqual([0, 1000, 2000])
  })

  it('stops at the row ceiling and says it did', async () => {
    const t = table(5000)
    const result = await fetchAllRowsConcurrent(t.build, { pageSize: 1000, maxRows: 3000 })
    expect(result.rows).toHaveLength(3000)
    expect(result.truncated).toBe(true)
  })
})
