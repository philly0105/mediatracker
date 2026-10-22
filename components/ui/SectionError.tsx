'use client'

import { useEffect, type CSSProperties } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Shared body for every `error.tsx`. The route-level boundaries are one-liners
 * around this so a failed query on /stats takes down the section that failed
 * rather than the whole page — previously the only boundary was at the root.
 * It is the EmptyState composition on a glass panel: icon circle, title,
 * secondary line, one button.
 */
export function SectionError({
  error,
  reset,
  title = 'Something went wrong',
  message = "That didn't load. It's usually temporary — try again, and if it keeps happening, reload the app.",
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  message?: string
}) {
  useEffect(() => {
    // The message stays in the console/server logs rather than on screen —
    // it can carry query fragments and upstream API detail.
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
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
          <AlertCircle className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <h1
          style={{
            margin: '16px 0 0',
            fontSize: 'var(--text-md)',
            lineHeight: '24px',
            fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--text-primary)',
          }}
        >
          {title}
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
          {message}
        </p>
        {error.digest && (
          <p className="tabular" style={{ margin: '8px 0 0', fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)' }}>
            Reference: {error.digest}
          </p>
        )}
        <Button onClick={reset} style={{ marginTop: 24 }}>
          <RotateCw className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  )
}
