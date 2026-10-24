'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function ShowError(props: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.unstable_retry} title="That show didn't load" message="We couldn't fetch this show's episodes. Try again — the rest of the app is unaffected." />
}
