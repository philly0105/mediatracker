import Link from 'next/link'

/**
 * The one piece of branding on the app's only public-facing pages. Someone
 * following a share link has no other signal about what they are looking at.
 */
export function ShareFooter() {
  return (
    <footer
      className="mt-12 pt-6 text-center"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Shared from{' '}
        <Link href="/" className="font-extrabold tracking-wide hover:underline" style={{ color: 'var(--text-primary)' }}>
          Dorf<span style={{ color: 'var(--brand-mark)' }}>Movies</span>
        </Link>
      </p>
    </footer>
  )
}
