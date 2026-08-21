'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function CollectionsError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Franchises didn't load" message="The franchise list failed to come back. Try again — the rest of the app is unaffected." />
}
