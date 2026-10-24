'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function SettingsError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Settings didn't load" message="Your settings failed to come back. Try again — nothing has been changed." />
}
