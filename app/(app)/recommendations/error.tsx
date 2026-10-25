'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function RecommendationsError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="Recommendations didn't load" message="We couldn't score your recommendations. Try again — the rest of the app is unaffected." />
}
