'use client'

import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Shared body for every `error.tsx`. The route-level boundaries are one-liners
 * around this so a failed query on /stats takes down the section that failed
 * rather than the whole page — previously the only boundary was at the root.
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
      <div className="glass-card rounded-[var(--radius-2xl)] p-8 max-w-md w-full space-y-4 text-center">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
        {error.digest && (
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            Reference: {error.digest}
          </p>
        )}
        <Button onClick={reset} fullWidth>
          <RotateCw className="w-4 h-4" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  )
}
