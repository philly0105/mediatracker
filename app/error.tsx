'use client'

import { SectionError } from '@/components/ui/SectionError'

// The root boundary replaces everything below the root layout, shell
// included, so it is the one place SectionError renders bare on the canvas.
// It gets the whole viewport to centre in; the panel's own 60vh frame then
// centres inside that. <main> rather than a <div> for the same reason: the
// group layout that owns the app's only landmark is one of the things this
// boundary replaced, so without it the page has no landmark at all.
export default function ErrorPage(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-dvh items-center justify-center">
      <SectionError {...props} />
    </main>
  )
}
