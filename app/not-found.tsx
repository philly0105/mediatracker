import Link from 'next/link'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Compass } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'

// Without this every 404 fell back to the bare "DorfMovies" default, so a
// mistyped URL was indistinguishable from the dashboard in history and tabs.
export const metadata: Metadata = { title: 'Page not found' }

// The SectionError composition on a glass panel: icon in a glass circle,
// title, secondary line, one primary action. The frame clears the mobile
// shell's bars (5rem over, 6rem under) rather than taking the whole viewport.
//
// <main>, not a <div>. This file serves two paths — a URL matching no route,
// which Next builds as the root layout plus this page alone, and a page
// calling notFound(), which the root segment's fallback boundary catches and
// renders in place of everything under that same root layout. Either way the
// group layout is gone, and with it the app's only <main>: the 404 had no
// landmark and no navigation at all.
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-[calc(100dvh-11rem)] items-center justify-center p-4">
      <div className="glass-panel glass-rim w-full max-w-md p-8 text-center">
        <span
          aria-hidden="true"
          className="glass-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            color: 'var(--text-secondary)',
          }}
        >
          <Compass className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <Eyebrow style={{ marginTop: 16 }}>Error 404</Eyebrow>
        <h1
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--text-md)',
            lineHeight: '24px',
            fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--text-primary)',
          }}
        >
          We couldn&apos;t find that page
        </h1>
        <p
          style={{
            margin: '8px auto 0',
            maxWidth: '42ch',
            fontSize: 'var(--text-base)',
            lineHeight: '20px',
            color: 'var(--text-secondary)',
          }}
        >
          The link may be out of date, or the title may have been removed from your
          library.
        </p>
        {/* A link cannot wrap a <button>, so it wears the primary Button's
            classes: the one white pill in the system. */}
        <Link
          href="/"
          className="btn btn-primary inline-flex items-center justify-center font-semibold"
          style={{ marginTop: 24, padding: '0 18px', fontSize: 'var(--text-base)', lineHeight: '20px' }}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
