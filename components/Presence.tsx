'use client'
import { Fragment, useEffect, useRef, useState } from 'react'

/**
 * Keeps a removed child mounted long enough to play its exit animation.
 *
 * This is the only thing the app ever used `<AnimatePresence>` for, and
 * framer-motion is 140KB of JavaScript that Turbopack duplicated into two
 * separate async chunks — one behind the ⌘K overlay, one behind the media
 * modal — so the first time you opened either, the animation was gated on a
 * download. The animations themselves are opacity plus a translate and a
 * scale, which is a CSS keyframe (see `.dialog-in` / `.dialog-out`).
 *
 * A child renders `exiting` as its exit class. `onExitComplete` fires once
 * nothing is leaving any more — MediaModalProvider hangs its `onClosed`
 * callbacks off that, which is how the ⌘K overlay knows it is safe to take
 * focus back.
 */

/**
 * How long a departing child is held on screen. A timer rather than an
 * `animationend` listener: the event is one more thing to plumb through every
 * child and it still needs a timeout behind it, because there are ways for it
 * never to arrive — an ancestor going display:none mid-exit, a UA that declined
 * to run the animation, a test environment with no animation engine. One
 * mechanism, and the CSS it has to agree with is twenty lines away.
 *
 * ponytail: keep in step with `.dialog-out` in globals.css (180ms + slack).
 */
const EXIT_MS = 200

export interface PresenceChild {
  key: string | number
  render: (exiting: boolean) => React.ReactNode
}

export function Presence({
  children,
  onExitComplete,
}: {
  children: readonly PresenceChild[]
  onExitComplete?: () => void
}) {
  // Keyed on the key list, not on the array: callers rebuild `children` every
  // render, so an identity comparison would re-run the diff below forever.
  const signature = children.map((child) => child.key).join(' ')
  const [tracked, setTracked] = useState({ signature, children })
  const [leaving, setLeaving] = useState<readonly PresenceChild[]>([])

  // Diffed during render rather than in an effect: an effect would unmount the
  // departing child for a frame before putting it back, which reads as a
  // flicker instead of an exit.
  if (tracked.signature !== signature) {
    const present = new Set(children.map((child) => child.key))
    // Reopening something mid-exit re-enters it rather than leaving two copies.
    const stillLeaving = leaving.filter((child) => !present.has(child.key))
    const newlyLeaving = tracked.children.filter(
      (child) =>
        !present.has(child.key) && !stillLeaving.some((other) => other.key === child.key)
    )
    setTracked({ signature, children })
    if (newlyLeaving.length > 0 || stillLeaving.length !== leaving.length) {
      setLeaving([...stillLeaving, ...newlyLeaving])
    }
  }

  // onExitComplete is reported from here rather than alongside the drain so it
  // lands *after* the commit that removed the child: its whole purpose is to
  // tell the ⌘K overlay that focus is safe to take back, and firing it any
  // earlier hands focus to a node still in the tree.
  const wasLeaving = useRef(false)
  useEffect(() => {
    if (leaving.length > 0) {
      wasLeaving.current = true
      const timer = setTimeout(() => setLeaving([]), EXIT_MS)
      return () => clearTimeout(timer)
    }
    if (wasLeaving.current) {
      wasLeaving.current = false
      onExitComplete?.()
    }
  }, [leaving, onExitComplete])

  // One flat list, not a present array rendered beside a leaving array: two
  // sibling arrays are two reconciliation slots, so a child crossing from one
  // to the other would remount — and remounting the modal on close tears down
  // its focus trap immediately, which is the thing the exit animation exists to
  // give time for. Departing children sort last so the topmost dialog stays on
  // top while it fades.
  const slots = [
    ...children.map((child) => ({ child, exiting: false })),
    ...leaving.map((child) => ({ child, exiting: true })),
  ]

  return (
    <>
      {slots.map(({ child, exiting }) => (
        <Fragment key={child.key}>{child.render(exiting)}</Fragment>
      ))}
    </>
  )
}
