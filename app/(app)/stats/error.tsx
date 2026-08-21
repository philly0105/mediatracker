'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function StatsError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Stats didn't load" message="The numbers behind this page failed to come back. Try again — the rest of the app is unaffected." />
}
