import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="glass-card rounded-[var(--radius-2xl)] p-8 max-w-md w-full text-center">
        <Compass className="w-10 h-10 mx-auto mb-5 opacity-40 text-[var(--text-muted)]" />
        <Eyebrow style={{ marginBottom: '8px' }}>Error 404</Eyebrow>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--weight-extrabold)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--text-primary)',
          }}
        >
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          The link may be out of date, or the title may have been removed from your
          library.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-fg)',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
