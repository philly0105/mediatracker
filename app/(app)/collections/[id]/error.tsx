'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function CollectionError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="That franchise didn't load" message="We couldn't fetch this collection. Try again — the rest of the app is unaffected." />
}
