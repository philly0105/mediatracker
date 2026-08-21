/**
 * Runs `task` over `items` with at most `limit` of them in flight, and resolves
 * with one settled result per input, in input order. Like `Promise.allSettled`,
 * a rejection never stops the remaining work.
 *
 * Bulk actions used to hand the whole selection to `Promise.allSettled`, which
 * fires every request at once — and the action bar offers "Select all". Each
 * `POST /api/watch` does an auth check, an `upsertMedia` that may hit TMDB, a
 * duplicate check and an insert, so a 500-title selection meant 500 of those
 * simultaneously.
 */
export async function poolSettled<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onSettled?: (done: number, total: number) => void
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length)
  let next = 0
  let done = 0

  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i], i) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
      onSettled?.(++done, items.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
