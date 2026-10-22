'use client'
// The ambient backdrop: one fixed layer behind the app showing the featured
// title's backdrop blurred 80px under the tint gradient. Fixed + filter is
// rasterised once and composited, so it costs nothing on scroll — as long as
// there is only one of it. Stacking a page's layer over a layout's layer would
// composite two 80px-blurred full-viewport images, so pages never paint their
// own. Instead:
//
//   <AmbientHost />            mounted once in the root layout, paints the one
//                              layer (two only during the 400ms crossfade).
//   <AmbientBackdrop src />    rendered by a page, the title page or the media
//                              modal; registers its image in a module-level
//                              registry and renders nothing. On unmount the
//                              registration goes with it.
//   <AmbientBackdrop fallback> the (app) layout's "most recent watch", streamed
//                              in after the page (see RecentAmbient).
//
// Precedence: the last-mounted page override wins, then the fallback, then
// tint only. The two tiers exist because mount order is not priority order: a
// page's effect runs before its layout's, and the streamed fallback arrives
// after both. Each instance keeps the id it took when it mounted, so Home
// changing its hero while a modal is open re-registers under the same, older
// id and does not steal the layer back from the modal.
//
// Never animate the blur. Only opacity crossfades, and not at all under
// prefers-reduced-motion. globals.css hides .ambient-img under
// prefers-reduced-transparency, leaving the tint.
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'

const TINT = 'linear-gradient(180deg, rgba(4,12,17,.50) 0%, rgba(4,12,17,.62) 55%, rgba(5,13,18,.84) 100%)'
// With no artwork the canvas gets a faint aqua radial so it is not a flat slab.
const AQUA_RADIAL = 'radial-gradient(1200px 600px at 20% -10%, rgba(143,227,240,.10), transparent 60%)'
const FADE_MS = 400

export function toAmbientSrc(url: string | null | undefined) {
  // TMDB backdrops come in at w1280; w780 is plenty under an 80px blur.
  return url ? url.replace(/\/t\/p\/w\d+\//, '/t/p/w780/').replace('/t/p/original/', '/t/p/w780/') : null
}

type Entry = { id: number; src: string; tier: 'page' | 'fallback' }

let entries: Entry[] = []
// Ids are handed out in mount order and kept for the life of the instance, so
// the highest id is the last-mounted registration whatever order the entries
// were (re)registered in.
let nextId = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The src the host should paint: the last-mounted page override, else the fallback, else nothing. */
function winner(): string | null {
  let page: Entry | undefined
  let fallback: Entry | undefined
  for (const entry of entries) {
    if (entry.tier === 'page') {
      if (!page || entry.id > page.id) page = entry
    } else if (!fallback || entry.id > fallback.id) {
      fallback = entry
    }
  }
  return (page ?? fallback)?.src ?? null
}

function register(id: number, src: string, tier: Entry['tier']) {
  entries = [...entries.filter((entry) => entry.id !== id), { id, src, tier }]
  emit()
}

function unregister(id: number) {
  entries = entries.filter((entry) => entry.id !== id)
  emit()
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

// Optional-called because jsdom, which the test suite runs in, has no matchMedia.
function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

// globals.css already flattens every transition under prefers-reduced-motion,
// so the fade itself needs no help. Reading the query here as well lets the
// host drop the outgoing layer at once instead of after the 400ms it would
// otherwise wait out, and keeps the no-fade promise testable without the
// stylesheet.
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => false,
  )
}

const IMG_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: '50% 30%',
  // The fallbacks cover the tokens' absence, not a different look: the blur
  // must never silently drop to zero and paint a sharp full-bleed image.
  filter: 'blur(var(--ambient-blur, 80px)) saturate(var(--ambient-saturate, 1.3))',
  // Overscan so the blur's transparent edge falls outside the viewport.
  transform: 'scale(1.15)',
}

type Shown = { src: string | null; previous: string | null; loaded: boolean }

export function AmbientHost() {
  const src = useSyncExternalStore(subscribe, winner, () => null)
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState<Shown>({ src, previous: null, loaded: false })

  if (shown.src !== src) {
    // Adjusting state on a prop change during render, so no frame paints the
    // old src as "current". The last fully loaded image stays painted
    // underneath until the new one has loaded, then the new one fades in over
    // it; that is the whole crossfade.
    setShown(
      src && src === shown.previous
        ? // Back to the image still on its way out: it is decoded and painted,
          // so promote it rather than mounting a second copy under the same key.
          { src, previous: shown.loaded ? shown.src : null, loaded: true }
        : { src, previous: shown.loaded ? shown.src : shown.previous, loaded: false },
    )
  }

  useEffect(() => {
    if (!shown.previous) return
    // Keep the old art until the new one has loaded. Once it has (or there is
    // no new one and the old is fading out), drop the extra layer after the
    // fade so at rest only one blurred image is ever painted.
    if (shown.src && !shown.loaded) return
    const timer = setTimeout(() => setShown((state) => ({ ...state, previous: null })), reducedMotion ? 0 : FADE_MS)
    return () => clearTimeout(timer)
  }, [shown.previous, shown.src, shown.loaded, reducedMotion])

  const transition = reducedMotion ? 'none' : `opacity ${FADE_MS}ms var(--ease-standard)`
  // Art is on screen once the new image has loaded, or while the old one is
  // still painted under it. Before the first load and during the final
  // fade-out nothing opaque is up, so the radial shows through.
  const hasArt = Boolean(shown.src && (shown.loaded || shown.previous))

  // Both images are keyed by src so that an image demoted from current to
  // previous keeps its DOM node: a transition only runs on a style change to
  // an existing node, so a fresh node mounted at opacity 0 would cut, not fade.
  return (
    <div
      aria-hidden="true"
      data-ambient-host=""
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {shown.previous && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative, blurred; next/image adds nothing here
        <img
          key={shown.previous}
          src={shown.previous}
          alt=""
          className="ambient-img"
          style={{ ...IMG_STYLE, opacity: shown.src ? 1 : 0, transition }}
        />
      )}
      {shown.src && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative, blurred; next/image adds nothing here
        <img
          key={shown.src}
          src={shown.src}
          alt=""
          decoding="async"
          fetchPriority="low"
          className="ambient-img"
          onLoad={() => setShown((state) => (state.src === shown.src ? { ...state, loaded: true } : state))}
          style={{ ...IMG_STYLE, opacity: shown.loaded ? 1 : 0, transition }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: TINT }} />
      {/* A gradient cannot transition, so the radial gets its own layer and
          fades with the art rather than popping in and out around it. */}
      <div style={{ position: 'absolute', inset: 0, background: AQUA_RADIAL, opacity: hasArt ? 0 : 1, transition }} />
    </div>
  )
}

/**
 * Registers `src` as the ambient backdrop while mounted. Renders nothing; the
 * host paints it. A null src registers nothing, so a title with no backdrop
 * falls through to the layout's fallback rather than a bare canvas.
 */
export default function AmbientBackdrop({ src, fallback = false }: { src?: string | null; fallback?: boolean }) {
  const [id] = useState(() => ++nextId)
  const url = toAmbientSrc(src)

  useEffect(() => {
    if (!url) return
    register(id, url, fallback ? 'fallback' : 'page')
    return () => unregister(id)
  }, [id, url, fallback])

  return null
}
