'use client'

import { SectionError } from '@/components/ui/SectionError'

export default function ErrorPage(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} />
}
