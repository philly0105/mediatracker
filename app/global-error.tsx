'use client'

import { useEffect } from 'react'

/**
 * The last resort: an error thrown in the root layout itself never reaches
 * `app/error.tsx`, because that boundary renders *inside* the layout. Without
 * this file such a failure renders the framework's own default page.
 *
 * It replaces the whole document, so it has to supply <html> and <body> and
 * cannot rely on any provider, token or component from the tree above it —
 * hence the inline styles.
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
      <body style={{ margin: 0, background: '#100e09', color: '#e8e4dc', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>DorfMovies could not start</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#a8a196', margin: '0 0 20px' }}>
              Something failed before the app could render. Reloading usually clears it.
            </p>
            {error.digest && (
              <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6f6a60' }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                color: '#111609', background: '#7c9a6a', border: 'none', borderRadius: 8, cursor: 'pointer',
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
