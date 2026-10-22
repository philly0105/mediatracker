import type { CSSProperties } from 'react'

// The mark from the reference sidebar: a light rounded square with the "D"
// and its counter cut out. app/icon.tsx draws the same shape with literals
// because Satori resolves no CSS variables.
function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="31" height="31" rx="10" fill="var(--text-primary)" />
      <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill="var(--ink)" />
      <circle cx="16.2" cy="16" r="2.6" fill="var(--text-primary)" />
    </svg>
  )
}

const WORDMARK: CSSProperties = {
  fontSize: 17,
  lineHeight: '22px',
  fontWeight: 'var(--weight-heading)',
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
}

/**
 * Mark plus "DorfMovies": the sidebar, the mobile top bar, the auth pages and
 * the share footer. `textClassName` lets the compact rail hide the name and
 * keep the mark.
 */
export function Wordmark({ textClassName }: { textClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className={textClassName} style={WORDMARK}>DorfMovies</span>
    </span>
  )
}
