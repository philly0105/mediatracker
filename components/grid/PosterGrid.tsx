import React from 'react'

/**
 * The poster grid under a toolbar: 2 columns on phones, 3 from 640, 4 from
 * 1024, 5 from 1280 and 6 from 1536, with the gap opening from 16 to 24 at the
 * 4-column step (plan Task 10). Fixed column counts rather than auto-fill so
 * the skeleton in loading.tsx and the loaded grid line up exactly. Cards in it
 * are PosterCards, which carry no blur.
 */
export function PosterGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 2xl:grid-cols-6',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
