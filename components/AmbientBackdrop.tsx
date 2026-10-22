'use client'
// The ambient backdrop: one fixed layer behind the app showing the featured
// title's backdrop blurred 80px under the tint gradient. Fixed + filter is
// rasterised once and composited, so it costs nothing on scroll — as long as
// there is only one of it. Stacking a page's layer over a layout's layer would
// composite two 80px-blurred full-viewport images, so pages never paint their
// own. Instead:
//
//   <AmbientHost />            mounted once in the root layout, paints the one
//                              layer (two during the 400ms crossfade; while
//                              titles change faster than a fade, each painted
//                              layer stays until its fade-out, or the fade-in
//                              over it, has ended, so a burst of changes can
//                              briefly stack more).
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
// prefers-reduced-transparency and forced colours, leaving the tint.
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type TransitionEvent } from 'react'

// .70 at the top is the contrast guard (spec §5.3): over the lightest
// backdrops, text sitting on the bare ambient has to keep 4.5:1.
const TINT = 'linear-gradient(180deg, rgba(4,12,17,.70) 0%, rgba(4,12,17,.74) 55%, rgba(5,13,18,.86) 100%)'
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

// `leaving` marks a layer that was fading out when newer art was pushed over
// it. It then sits under the wanted layer, where its place alone would show it
// again.
type Layer = { src: string; loaded: boolean; leaving?: boolean }
// The images on screen, bottom to top, and the one wanted. Layers under the
// wanted one are the art it fades in over; layers above it, and leaving ones
// under it, are on their way out, fading to nothing. Only the wanted layer can
// be unloaded, and it is never leaving.
type Shown = { src: string | null; layers: Layer[] }

const wantedIndex = (state: Shown) => state.layers.findIndex((layer) => layer.src === state.src)

function retarget(state: Shown, src: string | null): Shown {
  // A layer that never painted goes at once. Painted ones stay: under the new
  // art until it has faded in, or, past the one coming back, fading out over
  // it. Coming back is by src, so the image keeps its decoded node rather
  // than mounting a second copy under the same key, and it stops leaving.
  // New art pushed on top marks the layers fading out over the old wanted one
  // as leaving, so they keep fading out under it rather than showing again.
  // Not after a null src: then the last art stays under the new title, as on
  // a first swap.
  const oldWanted = wantedIndex(state)
  const back = state.layers.some((layer) => layer.loaded && layer.src === src)
  const layers = state.layers
    .map((layer, i) => {
      if (layer.src === src) return { ...layer, leaving: false }
      if (src && !back && oldWanted >= 0 && i > oldWanted) return { ...layer, leaving: true }
      return layer
    })
    .filter((layer) => layer.loaded)
  if (src && !back) layers.push({ src, loaded: false })
  return { src, layers }
}

function markLoaded(state: Shown, src: string): Shown {
  const layers = state.layers.map((layer) => (layer.src === src && !layer.loaded ? { src, loaded: true } : layer))
  return layers.some((layer, i) => layer !== state.layers[i]) ? { ...state, layers } : state
}

// A layer's opacity fade has ended. Faded out (above the wanted layer, or
// leaving), it goes. Faded in, it hides whatever is under it, so that goes; a
// fade-in carried over from before a swap (the layer is now under newer art)
// drops the same thing, nothing.
function afterFade(state: Shown, src: string): Shown {
  const index = state.layers.findIndex((layer) => layer.src === src)
  if (index < 0) return state
  const layer = state.layers[index]
  if (index > wantedIndex(state) || layer.leaving) return { ...state, layers: state.layers.filter((_, i) => i !== index) }
  return index > 0 && layer.loaded ? { ...state, layers: state.layers.slice(index) } : state
}

// What the fades leave at rest: nothing above the wanted layer, nothing
// leaving, nothing under the topmost painted one. The same state back means
// nothing is pending.
function settle(state: Shown): Shown {
  const wanted = wantedIndex(state)
  let from = 0
  for (let i = 0; i <= wanted; i++) if (state.layers[i].loaded && !state.layers[i].leaving) from = i
  const layers = state.layers.slice(from, wanted + 1).filter((layer) => !layer.leaving)
  return layers.length === state.layers.length ? state : { ...state, layers }
}

const isFade = (event: TransitionEvent<HTMLImageElement>) => event.propertyName === 'opacity'

export function AmbientHost() {
  const src = useSyncExternalStore(subscribe, winner, () => null)
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState<Shown>(() => retarget({ src: null, layers: [] }, src))
  const host = useRef<HTMLDivElement>(null)

  if (shown.src !== src) {
    // Adjusting state on a prop change during render, so no frame paints the
    // old src as wanted. The painted art stays underneath until the new one
    // has loaded, then the new one fades in over it; that is the whole
    // crossfade.
    setShown(retarget(shown, src))
  }

  useEffect(() => {
    // Keep the old art until the new one has loaded. Once it has (or it is
    // fading out with nothing under it), the fade's transitionend drops the
    // extra layer so at rest only one blurred image is ever painted. The
    // timer covers the cases where no transition runs: reduced motion, a
    // background tab. It must not fire into a fade still in flight (frames
    // stall while the new art rasterises, so a fade can start long after this
    // effect ran), so while anything in the host still animates it waits and
    // looks again.
    if (settle(shown) === shown) return
    let timer: ReturnType<typeof setTimeout>
    const drop = () => {
      if (host.current?.getAnimations?.({ subtree: true }).length) timer = setTimeout(drop, FADE_MS)
      else setShown(settle)
    }
    timer = setTimeout(drop, reducedMotion ? 0 : FADE_MS)
    return () => clearTimeout(timer)
  }, [shown, reducedMotion])

  const onLoad = (loadedSrc: string) => {
    const show = () => setShown((state) => markLoaded(state, loadedSrc))
    // Two frames, so the opacity-0 start has painted before the change to 1:
    // a cached image loads inside the mount's own frame, and the two styles
    // would coalesce into a cut. Reduced motion wants the cut.
    if (reducedMotion) show()
    else requestAnimationFrame(() => requestAnimationFrame(show))
  }

  const transition = reducedMotion ? 'none' : `opacity ${FADE_MS}ms var(--ease-standard)`
  const wanted = wantedIndex(shown)
  // Art is on screen once the wanted image has loaded, or while older art is
  // still painted under it. Before the first load and during the final
  // fade-out nothing opaque is up, so the radial shows through. A leaving
  // layer is fading out, so it does not count.
  const hasArt = shown.layers.slice(0, wanted + 1).some((layer) => layer.loaded && !layer.leaving)

  // Images are keyed by src and never reordered, so an image that changes
  // role keeps its DOM node: a transition only runs on a style change to an
  // existing node, so a fresh (or re-inserted) node would cut, not fade.
  return (
    <div
      ref={host}
      aria-hidden="true"
      data-ambient-host=""
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {shown.layers.map((layer, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- decorative, blurred; next/image adds nothing here
        <img
          key={layer.src}
          src={layer.src}
          alt=""
          decoding="async"
          fetchPriority="low"
          className="ambient-img"
          onLoad={() => onLoad(layer.src)}
          onTransitionEnd={(event) => { if (isFade(event)) setShown((state) => afterFade(state, layer.src)) }}
          // Above the wanted layer, or leaving, is on the way out.
          style={{ ...IMG_STYLE, opacity: layer.loaded && !layer.leaving && index <= wanted ? 1 : 0, transition }}
        />
      ))}
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
