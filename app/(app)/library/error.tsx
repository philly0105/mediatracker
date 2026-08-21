'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function LibraryError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Library didn't load" message="Your library failed to come back. Try again — the rest of the app is unaffected." />
}
