'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function RecommendationsError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Recommendations didn't load" message="We couldn't score your recommendations. Try again — the rest of the app is unaffected." />
}
