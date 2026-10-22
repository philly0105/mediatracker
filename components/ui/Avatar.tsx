import { User } from 'lucide-react'

/**
 * Initials in a glass circle: white on the ghost fill, with a 2px ring of the
 * same fill standing it off the surface behind it.
 *
 * This replaces a DiceBear avatar whose seed was the user's raw email address
 * in a query string — sent to a third party on every authenticated page load,
 * twice (desktop rail plus mobile bar), on the critical render path, and
 * depending on a service the app does not control. Initials cost no requests
 * and leak nothing.
 */
export function Avatar({ email, size = 44 }: { email?: string | null; size?: number }) {
  const initial = email?.trim()?.[0]?.toUpperCase()

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: 'var(--btn-ghost-bg)',
        boxShadow: '0 0 0 2px var(--btn-ghost-bg)',
        color: 'var(--text-primary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // 16px at the 44px default, the reference's header avatar.
        fontSize: Math.round(size * 0.36),
        fontWeight: 'var(--weight-heading)',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initial ?? <User strokeWidth={1.8} style={{ width: size * 0.45, height: size * 0.45 }} />}
    </span>
  )
}
