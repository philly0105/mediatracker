// Small formatters the Home panels share. None of them go through
// `new Date(string)`: a bare YYYY-MM-DD parses as UTC and lands on the
// previous day west of Greenwich (see lib/formatDate).

export function parseDay(dateStr: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? '')
  if (!match) return null
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(day.getTime()) ? null : day
}

/** "3h 42m", "2h", "53m". Null for nothing or zero. */
export function formatMinutes(mins: number | null | undefined): string | null {
  if (!mins || mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "Oct 19": the date under a recently watched poster. */
export function formatShortDate(dateStr: string | null | undefined): string | undefined {
  const day = parseDay(dateStr)
  return day ? day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined
}

/** "Fri · in 8 days", "Tomorrow", "Today": the line under a coming-soon title. */
export function formatCountdown(dateStr: string, today: Date): string | null {
  const day = parseDay(dateStr)
  if (!day) return null
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((day.getTime() - start.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' })
  return `${weekday} · in ${days} days`
}
