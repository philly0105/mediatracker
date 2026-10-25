'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function ShowError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="That show didn't load" message="We couldn't fetch this show's episodes. Try again — the rest of the app is unaffected." />
}
