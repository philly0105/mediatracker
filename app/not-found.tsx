import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Compass } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'

// The SectionError composition on a glass panel: icon in a glass circle,
// title, secondary line, one primary action. It renders in two places —
// inside the signed-in shell when a page calls notFound(), and bare in the
// root layout for a URL that matches no route — so the frame clears the
// mobile shell's bars (5rem over, 6rem under) rather than taking the viewport.
export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-11rem)] items-center justify-center p-4">
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
    </div>
  )
}
