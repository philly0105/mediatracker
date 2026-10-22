'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * The last resort: an error thrown in the root layout itself never reaches
 * `app/error.tsx`, because that boundary renders *inside* the layout. Without
 * this file such a failure renders the framework's own default page.
 *
 * It replaces the whole document, so it has to supply <html> and <body> and
 * cannot rely on any provider, token or component from the tree above it —
 * hence the inline styles. The values are the Spatial Glass palette written
 * out: canvas #061015, the deep panel #0B1A21 under the panel gradient (there
 * is no ambient art to blur here, so the solid fallback surface is the right
 * one), text #F3F8FA and the white pill with ink text. The white alphas are
 * the system's white, #F3F8FA, which is what every bg-white/x utility
 * resolves to. The layout mirrors SectionError: a centred 448px panel with
 * the icon circle, a 16/24 title, a 14/20 line, the digest and one button.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#061015',
          color: '#F3F8FA',
          fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          letterSpacing: '-0.006em',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 448,
              padding: 32,
              textAlign: 'center',
              borderRadius: 28,
              background: 'linear-gradient(180deg, rgba(243,248,250,.09), rgba(243,248,250,.03)), #0B1A21',
              boxShadow: 'inset 0 1px 0 rgba(243,248,250,.14), 0 30px 60px -24px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.16)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(243,248,250,.16)',
                boxShadow: 'inset 0 1px 0 rgba(243,248,250,.20), inset 0 0 0 1px rgba(243,248,250,.06)',
                color: 'rgba(236,245,249,.80)',
              }}
            >
              <AlertCircle size={20} strokeWidth={1.8} />
            </span>
            <h1 style={{ fontSize: 16, lineHeight: '24px', fontWeight: 600, margin: '16px 0 0' }}>DorfMovies could not start</h1>
            <p style={{ fontSize: 14, lineHeight: '20px', color: 'rgba(236,245,249,.80)', margin: '8px auto 0', maxWidth: '42ch' }}>
              Something failed before the app could render. Reloading usually clears it.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, lineHeight: '16px', color: 'rgba(236,245,249,.74)', margin: '8px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 24, minHeight: 44, padding: '0 18px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                fontFamily: 'inherit', color: '#08161C', background: '#F3F8FA', border: 'none', borderRadius: 999,
                boxShadow: '0 10px 24px -8px rgba(0,0,0,.50)', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
