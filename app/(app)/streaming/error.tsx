'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function StreamingError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Streaming didn't load" message="We couldn't reach the streaming catalogue. Try again — the rest of the app is unaffected." />
}
