'use client'

import { SectionError } from '@/components/ui/SectionError'

// The root boundary replaces everything below the root layout, shell
// included, so it is the one place SectionError renders bare on the canvas.
// It gets the whole viewport to centre in; the panel's own 60vh frame then
// centres inside that.
export default function ErrorPage(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <SectionError {...props} />
    </div>
  )
}
