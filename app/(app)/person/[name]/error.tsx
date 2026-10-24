'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function PersonError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="That person didn't load" message="We couldn't fetch this filmography. Try again — the rest of the app is unaffected." />
}
