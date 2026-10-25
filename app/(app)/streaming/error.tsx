'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function StreamingError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="Streaming didn't load" message="We couldn't reach the streaming catalogue. Try again — the rest of the app is unaffected." />
}
