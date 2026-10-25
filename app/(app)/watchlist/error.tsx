'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function WatchlistError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="Watchlist didn't load" message="Your watchlist failed to come back. Try again — the rest of the app is unaffected." />
}
