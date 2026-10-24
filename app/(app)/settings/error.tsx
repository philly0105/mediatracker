'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function SettingsError(props: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.unstable_retry} title="Settings didn't load" message="Your settings failed to come back. Try again — nothing has been changed." />
}
