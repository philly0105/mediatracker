// The Home header's greeting line. Pure functions, so the hour logic is
// testable and the client component that reads the clock stays tiny.

const pad = (n: number) => String(n).padStart(2, '0')

/** "Good morning" 5–11, "Good afternoon" 12–17, "Good evening" otherwise. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * "richard.dorf+films@example.com" → "Richard". The fallback when the session
 * carries no display name: the local part is the best name on hand then; null
 * when there is nothing usable, and the greeting stands alone.
 */
export function firstNameFromEmail(email: string | null | undefined): string | null {
  const local = email?.split('@')[0] ?? ''
  const first = local.split(/[._\-+\d]/)[0]
  if (!first) return null
  return first[0].toUpperCase() + first.slice(1).toLowerCase()
}

/**
 * The name the greeting uses: the first word of the account's display name
 * ("Richard Dorf" → "Richard"), as written, or else the email's guess.
 */
export function greetingName(name: string | null | undefined, email: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || firstNameFromEmail(email)
}

/** "Thursday, October 22": the eyebrow over the greeting. */
export function formatEyebrowDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * The clock to the hour as "YYYY-MM-DDTHH" in local time. The server renders
 * its own key and the client re-reads it after hydration, so the greeting is
 * right for the reader's time zone without a hydration mismatch; a string key
 * is what useSyncExternalStore can compare by value.
 */
export function timeKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`
}

export function parseTimeKey(key: string): { date: Date; hour: number } {
  const [y, m, d, h] = key.split(/[-T]/).map(Number)
  return { date: new Date(y, m - 1, d), hour: h }
}
