'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function SettingsError(props: {
  error: unknown
  retry: () => void
}) {
  return <SectionError error={props.error} onRetry={props.retry} title="Settings didn't load" message="Your settings failed to come back. Try again — nothing has been changed." />
}
