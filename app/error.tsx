'use client'

import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The message stays in the console/server logs rather than on screen —
    // it can carry query fragments and upstream API detail.
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card rounded-[var(--radius-2xl)] border border-white/10 p-8 max-w-md w-full space-y-4 text-center">
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          That page didn&apos;t load. It&apos;s usually temporary — try again, and if it keeps
          happening, reload the app.
        </p>
        {error.digest && (
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            Reference: {error.digest}
          </p>
        )}
        <Button onClick={reset} fullWidth className="hover:!bg-violet-600 hover:!border-violet-500">
          <RotateCw className="w-4 h-4" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  )
}
