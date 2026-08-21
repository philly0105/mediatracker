import { User } from 'lucide-react'

/**
 * Initials in a tinted circle.
 *
 * This replaces a DiceBear avatar whose seed was the user's raw email address
 * in a query string — sent to a third party on every authenticated page load,
 * twice (desktop rail plus mobile bar), on the critical render path, and
 * depending on a service the app does not control. Initials cost no requests
 * and leak nothing.
 */
export function Avatar({ email, size = 32 }: { email?: string | null; size?: number }) {
  const initial = email?.trim()?.[0]?.toUpperCase()

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: 'var(--green-tint-bg)',
        border: '1px solid var(--green-tint-border)',
        color: 'var(--accent)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.44),
        fontWeight: 700,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initial ?? <User style={{ width: size * 0.5, height: size * 0.5 }} />}
    </span>
  )
}
