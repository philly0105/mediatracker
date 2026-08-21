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
