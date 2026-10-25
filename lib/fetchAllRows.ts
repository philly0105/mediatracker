// PostgREST caps a single response at its `max-rows` setting — 1000 on hosted
// Supabase — and says nothing when it truncates. An unbounded `.select()` over
// watch_entries therefore returns a quietly wrong answer for any library past
// that size: the Library shows 1000 titles and stops growing, Stats undercounts,
// and Franchises loses collections. This walks the range windows instead.
//
// `build` must construct a fresh query on each call: range() mutates the builder
// it is called on, so a single reused builder cannot be paged.
//
// Callers must give the query a deterministic total order (a unique tiebreak
// column alongside whatever they sort by). Without one, rows can shift between
// windows and the pages will duplicate and skip.

import { poolSettled } from './pool'

const PAGE_SIZE = 1000

// Roughly 20 years of daily logging. A read that big means something is wrong
// upstream, and unbounded looping against a hostile row count is worse than a
// flagged truncation.
const MAX_ROWS = 20000

type PagedResult<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  opts: { pageSize?: number; maxRows?: number } = {}
): Promise<{ rows: T[]; error: string | null; truncated: boolean }> {
  const pageSize = opts.pageSize ?? PAGE_SIZE
  const maxRows = opts.maxRows ?? MAX_ROWS
  const rows: T[] = []

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) return { rows, error: error.message, truncated: false }
    if (!data || data.length === 0) return { rows, error: null, truncated: false }
    rows.push(...data)
    // A short page is the last page — one fewer round-trip than asking again.
    if (data.length < pageSize) return { rows, error: null, truncated: false }
  }

  return { rows, error: null, truncated: true }
}

type CountedPage<T> = PagedResult<T> & { count?: number | null }

// How many later pages are in flight at once. Enough that a large library
// costs a few round trips rather than one per thousand rows, few enough that
// a 20,000-row read is not twenty simultaneous requests from one render.
const CONCURRENT_PAGES = 4

/**
 * fetchAllRows for a read that sits on a hot path, where walking the windows
 * one after another costs a round trip per thousand rows on every render.
 *
 * The first window asks for an exact count alongside its rows, so a library
 * under one page is still a single request — counting first and fetching
 * second would have made the common case slower to speed up the rare one.
 * Past one page, the count says how many windows remain, and they are fetched
 * CONCURRENT_PAGES at a time and stitched back in order.
 *
 * `build(from, to, withCount)` must request `{ count: 'exact' }` in its select
 * when `withCount` is true, and carry the same unique-tiebreak order
 * fetchAllRows requires. The windows run to `count` inclusive, so a row
 * inserted between the count and the fetch has an extra window to land in
 * when the total sits exactly on a page boundary. A response with no count
 * falls back to walking the rest in sequence.
 */
export async function fetchAllRowsConcurrent<T>(
  build: (from: number, to: number, withCount: boolean) => PromiseLike<CountedPage<T>>,
  opts: { pageSize?: number; maxRows?: number } = {}
): Promise<{ rows: T[]; error: string | null; truncated: boolean }> {
  const pageSize = opts.pageSize ?? PAGE_SIZE
  const maxRows = opts.maxRows ?? MAX_ROWS

  const first = await build(0, pageSize - 1, true)
  if (first.error) return { rows: [], error: first.error.message, truncated: false }
  const rows: T[] = [...(first.data ?? [])]
  if (rows.length < pageSize) return { rows, error: null, truncated: false }

  if (typeof first.count !== 'number') {
    const rest = await fetchAllRows<T>((from, to) => build(from + pageSize, to + pageSize, false), {
      pageSize,
      maxRows: maxRows - pageSize,
    })
    return { rows: [...rows, ...rest.rows], error: rest.error, truncated: rest.truncated }
  }

  const last = Math.min(first.count, maxRows - 1)
  const starts: number[] = []
  for (let from = pageSize; from <= last; from += pageSize) starts.push(from)

  const pages = await poolSettled(starts, CONCURRENT_PAGES, (from) =>
    Promise.resolve(build(from, from + pageSize - 1, false))
  )
  for (const page of pages) {
    if (page.status === 'rejected') {
      return { rows, error: String(page.reason?.message ?? page.reason), truncated: false }
    }
    if (page.value.error) return { rows, error: page.value.error.message, truncated: false }
    rows.push(...(page.value.data ?? []))
  }

  return { rows, error: null, truncated: first.count > maxRows }
}
