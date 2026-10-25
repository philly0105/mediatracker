'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function PersonError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="That person didn't load" message="We couldn't fetch this filmography. Try again — the rest of the app is unaffected." />
}
