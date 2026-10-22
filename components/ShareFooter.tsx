import Link from 'next/link'
import { Wordmark } from '@/components/AuthShell'

/**
 * The one piece of branding on the app's only public-facing pages. Someone
 * following a share link has no other signal about what they are looking at.
 */
export function ShareFooter() {
  return (
    <footer
      className="mt-12 flex flex-col items-center pt-6 text-center"
      style={{ borderTop: '1px solid var(--border-divider)' }}
    >
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}>
        Shared from
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-[var(--glass-fill-hover)]"
      >
        <Wordmark />
      </Link>
    </footer>
  )
}
