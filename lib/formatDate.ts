// Canonical date formatting for user-facing YYYY-MM-DD strings.
//
// Lived in EpisodeTracker until three other surfaces were found rendering raw
// ISO strings or parsing them through `new Date(dateString)` — which reads a
// bare YYYY-MM-DD as UTC and renders the previous day anywhere west of
// Greenwich. Everything that shows a stored date goes through here.

/**
 * "Jan 20, 2008". Explicit locale so the label is identical on the server, in
 * the browser and in tests. Returns null for anything unparseable so callers
 * can decide what to render instead.
 */
export function formatAirDate(airDate: string): string | null {
  const [y, m, d] = airDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Same formatting, falling back to the raw string rather than null. */
export function formatDateLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return formatAirDate(dateStr) ?? dateStr
}

export function isUnaired(airDate: string | null, today = new Date()): boolean {
  if (!airDate) return false
  const [y, m, d] = airDate.split('-').map(Number)
  if (!y || !m || !d) return false
  return new Date(y, m - 1, d).getTime() > today.getTime()
}
