# R7-1 — Accessibility and motion pass

Goal: three global gaps, fixed app-wide. (1) framer-motion animations ignore
the OS "reduce motion" setting — a `MotionConfig reducedMotion="user"` wrapper
plus a CSS media block fixes both motion systems. (2) Keyboard focus is
invisible on most controls — a global `:focus-visible` outline fixes every
button/link at once. (3) A sweep of icon-only buttons have no accessible name,
and the rating stars are mouse-only.

## 1. NEW `components/MotionProvider.tsx`

The root layout is a server component, so the framer-motion context needs a
tiny client wrapper:

```tsx
'use client'
import { MotionConfig } from 'framer-motion'

// Makes every framer-motion animation in the tree respect the OS-level
// "reduce motion" preference. CSS transitions are handled separately in
// globals.css — MotionConfig cannot reach those.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
```

## 2. `app/layout.tsx`

Import `{ MotionProvider }` and wrap it around the existing `<ToastProvider>`
block (ToastProvider itself renders motion components, so MotionProvider must
sit outside it):

```tsx
<MotionProvider>
  <ToastProvider>
    ...everything currently inside ToastProvider, unchanged...
  </ToastProvider>
</MotionProvider>
```

No other layout changes.

## 3. `app/globals.css` — two appended blocks

At the end of the file:

```css
/* Keyboard focus: most controls either disable the UA outline or never had
   a visible one. :focus-visible only fires for keyboard-driven focus, so
   mouse clicks stay ring-free; !important beats the scattered
   focus:outline-none utilities without touching each call site. */
*:focus-visible {
  outline: 2px solid var(--accent) !important;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 4. Aria-label sweep — exact edits

Each is an attribute addition only; no markup restructuring:

- `components/EditEntryModal.tsx` — the `onClick={onClose}` button holding
  `<X className="w-5 h-5" />`: add `aria-label="Close"`.
- `components/MediaInfoModal.tsx` — the close button (absolute top-5 right-5,
  `<X className="w-4 h-4" />`): add `aria-label="Close"`.
- `components/SimilarModal.tsx` — the close button next to the heading: add
  `aria-label="Close"`.
- `components/TonightPickModal.tsx` — the close button: add
  `aria-label="Close"`.
- `components/MultiSelectProvider.tsx` — the `onClick={clearSelection}`
  button holding an `<X>`: add `aria-label="Clear selection"`.
- `components/Sidebar.tsx` — the mobile More-drawer close button
  (`onClick={() => setMoreOpen(false)}` holding `<X className="w-5 h-5" />`):
  add `aria-label="Close menu"`. Also the mobile top-bar avatar
  `<Link href="/settings">`: add `aria-label="Settings"`, and change the
  avatar `<img>` inside it from `alt="User Avatar"` to `alt=""` (the link now
  carries the name; the image is decorative).
- `components/MediaCard.tsx` — the edit button (`title="Edit entry"`): add
  `aria-label="Edit entry"`. The delete button (`title="Delete entry"`): add
  `aria-label="Delete entry"`.
- `app/watchlist/page.tsx` — the four hover-chip buttons: add `aria-label`
  duplicating each existing `title` verbatim (`"Move to Must Watch"`,
  `"Move to Want to Watch"`, `"Move to Someday"`, `"Remove"`).

## 5. `components/RatingStars.tsx` — keyboard-accessible stars

Replace the two absolutely-positioned hit-area `<div>`s per star with
`<button type="button">`s carrying accessible names, rendered only when the
control is interactive. Full replacement for the component body (visual star
spans are unchanged):

```tsx
'use client'
import { useState } from 'react'

interface Props {
  value: number | null
  onChange?: (rating: number) => void
  readOnly?: boolean
}

export default function RatingStars({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0
  const interactive = !readOnly && !!onChange

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role={interactive ? 'group' : 'img'}
      aria-label={value ? `Rated ${value} out of 5` : 'Not rated'}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative w-6 h-6">
            <span className="text-2xl leading-none" style={{ color: 'var(--zinc-700)' }}>★</span>
            {(full || half) && (
              <span
                className="absolute inset-0 text-2xl leading-none overflow-hidden"
                style={{ width: full ? '100%' : '50%', color: 'var(--amber-400)' }}
              >★</span>
            )}
            {interactive && (
              <>
                <button
                  type="button"
                  data-half={`${star - 0.5}`}
                  aria-label={`Rate ${star - 0.5} stars`}
                  className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star - 0.5)}
                  onClick={() => onChange?.(star - 0.5)}
                />
                <button
                  type="button"
                  data-half={`${star}.0`}
                  aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                  className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star)}
                  onClick={() => onChange?.(star)}
                />
              </>
            )}
          </div>
        )
      })}
      {value && <span className="ml-2 text-sm text-gray-400">{value}/5</span>}
    </div>
  )
}
```

Notes pinned down so there is nothing to decide:

- `data-half` values and positions are IDENTICAL to today's divs — existing
  tests that click `[data-half="3.0"]` keep passing.
- Read-only usages render NO hit areas at all (they were inert divs before).
  This also means `PosterCard`, whose root is a `<button>`, never contains a
  nested button.
- Tailwind's preflight already renders buttons borderless/transparent, so the
  buttons need no extra style resets.

## 6. Tests — `components/__tests__/RatingStars.test.tsx`

Keep every existing test unchanged. ADD:

1. `hit areas are labeled buttons`: render with `onChange`; expect
   `screen.getByRole('button', { name: 'Rate 0.5 stars' })` and
   `screen.getByRole('button', { name: 'Rate 5 stars' })` to exist.
2. `read-only renders no interactive hit areas`: render with
   `value={3.5}` and `readOnly`; expect `screen.queryAllByRole('button')` to
   have length 0 and the container to have accessible name
   `Rated 3.5 out of 5` (`screen.getByRole('img', { name: 'Rated 3.5 out of 5' })`).

## 7. Out of scope

Do not touch any other animation call sites, `KeyboardShortcuts.tsx`,
`SearchOverlay.tsx` (already labeled), API routes, or anything under `docs/`.
Do not restyle anything — this round adds attributes, one wrapper, and two
CSS blocks only.
