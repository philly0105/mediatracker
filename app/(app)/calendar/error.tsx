'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function CalendarError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Calendar didn't load" message="The release schedule failed to come back. Try again — the rest of the app is unaffected." />
}
