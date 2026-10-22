// Small formatters shared by the title components. They live here rather than
// in lib/ because nothing outside the hero reads them.

/** "3h 42m", "2h", "53m". Anything under a minute rounds to "0m". */
export function formatMinutes(mins: number): string {
  const whole = Math.max(0, Math.round(mins))
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** TMDB's 0–10 vote average as the hero's "84%"; null when there is no score. */
export function tmdbPercent(score: number | null | undefined): string | null {
  if (score == null || !(score > 0)) return null
  return `${Math.round(score * 10)}%`
}
