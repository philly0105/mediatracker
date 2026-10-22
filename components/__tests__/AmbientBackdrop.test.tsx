import { act, fireEvent, render } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import AmbientBackdrop, { AmbientHost, toAmbientSrc } from '@/components/AmbientBackdrop'

const SEVERANCE = 'https://image.tmdb.org/t/p/w1280/severance.jpg'
const SEVERANCE_780 = 'https://image.tmdb.org/t/p/w780/severance.jpg'
const BEAR = 'https://image.tmdb.org/t/p/w1280/the-bear.jpg'
const BEAR_780 = 'https://image.tmdb.org/t/p/w780/the-bear.jpg'
const ANDOR = 'https://image.tmdb.org/t/p/original/andor.jpg'
const ANDOR_780 = 'https://image.tmdb.org/t/p/w780/andor.jpg'

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

function images(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLImageElement>('img'))
}

// The host renders the outgoing image first and the incoming one after it, so
// the last <img> is always the one being shown.
function current(container: HTMLElement) {
  const all = images(container)
  return all[all.length - 1] ?? null
}

// The no-art radial is its own layer so it can fade; find it by its gradient.
function radial(container: HTMLElement) {
  const layer = container.querySelector('[data-ambient-host]')!
  return Array.from(layer.children).find(
    (child) => (child as HTMLElement).style.background.includes('radial-gradient'),
  ) as HTMLElement
}

describe('toAmbientSrc', () => {
  it('steps a w1280 backdrop down to w780', () => {
    expect(toAmbientSrc(SEVERANCE)).toBe(SEVERANCE_780)
  })

  it('steps an original-size backdrop down to w780', () => {
    expect(toAmbientSrc(ANDOR)).toBe(ANDOR_780)
  })

  it('leaves a w780 backdrop alone', () => {
    expect(toAmbientSrc(SEVERANCE_780)).toBe(SEVERANCE_780)
  })

  it('passes null and undefined through as null', () => {
    expect(toAmbientSrc(null)).toBeNull()
    expect(toAmbientSrc(undefined)).toBeNull()
  })
})

describe('AmbientHost', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('paints the tint alone, with the aqua radial, when nothing has registered an image', () => {
    const { container } = render(<AmbientHost />)
    const layer = container.querySelector('[data-ambient-host]')!

    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(images(container)).toHaveLength(0)
    expect(radial(container).style.opacity).toBe('1')
  })

  it('paints a registered image as decorative art at w780 and fades the radial out once it has loaded', () => {
    const { container } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    const layer = container.querySelector('[data-ambient-host]')!
    const img = current(container)!

    expect(img).toHaveAttribute('src', SEVERANCE_780)
    expect(img).toHaveAttribute('alt', '')
    expect(layer.contains(img)).toBe(true)
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    // Nothing is painted until the image arrives, so the radial stays up.
    expect(radial(container).style.opacity).toBe('1')
    fireEvent.load(img)
    expect(radial(container).style.opacity).toBe('0')
  })

  it('registers nothing for a null src, so the fallback shows through', () => {
    const { container } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={BEAR} fallback />
        <AmbientBackdrop src={null} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', BEAR_780)
  })

  it('lets a page override beat the fallback even when the fallback mounts later, and reverts on unmount', () => {
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', SEVERANCE_780)

    // The streamed "most recent watch" arrives after the page's own art.
    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
        <AmbientBackdrop src={BEAR} fallback />
      </>
    )
    expect(current(container)).toHaveAttribute('src', SEVERANCE_780)
    expect(images(container)).toHaveLength(1)

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={BEAR} fallback />
      </>
    )
    expect(current(container)).toHaveAttribute('src', BEAR_780)
  })

  it('gives the layer to the newest override and hands it back when that one unmounts', () => {
    // Home's hero show, then a media modal opened on top of it.
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', BEAR_780)

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', SEVERANCE_780)
  })

  it('keeps the layer with the modal when Home re-renders with a different hero', () => {
    // Marking the hero's last episode from the modal refreshes Home, whose
    // first continue-watching show changes while the modal is still open.
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', BEAR_780)

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={ANDOR} />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', BEAR_780)

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={ANDOR} />
      </>
    )
    expect(current(container)).toHaveAttribute('src', ANDOR_780)
  })

  it('crossfades by opacity: keeps the old art under the new one until it loads, then drops it after 400ms', () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    fireEvent.load(current(container)!)
    expect(current(container)!.style.opacity).toBe('1')

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    let [previous, next] = images(container)
    expect(previous).toHaveAttribute('src', SEVERANCE_780)
    expect(previous.style.opacity).toBe('1')
    expect(next).toHaveAttribute('src', BEAR_780)
    expect(next.style.opacity).toBe('0')

    // Not loaded yet: the old art stays however long that takes.
    act(() => { vi.advanceTimersByTime(1000) })
    expect(images(container)).toHaveLength(2)

    fireEvent.load(next)
    ;[previous, next] = images(container)
    expect(next.style.opacity).toBe('1')
    expect(next.style.transition).toContain('opacity')
    expect(next.style.transition).not.toContain('filter')

    act(() => { vi.advanceTimersByTime(399) })
    expect(images(container)).toHaveLength(2)
    act(() => { vi.advanceTimersByTime(1) })
    expect(images(container)).toHaveLength(1)
    expect(current(container)).toHaveAttribute('src', BEAR_780)
  })

  it('returns to the outgoing image on its own node instead of mounting a second copy', () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    const painted = current(container)!
    fireEvent.load(painted)

    // Navigate away, then back before the new art has loaded.
    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    expect(images(container)).toHaveLength(1)
    expect(current(container)).toBe(painted)
    expect(painted.style.opacity).toBe('1')
  })

  it('swaps without a fade under prefers-reduced-motion', () => {
    vi.useFakeTimers()
    stubReducedMotion(true)
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    fireEvent.load(current(container)!)

    rerender(
      <>
        <AmbientHost />
        <AmbientBackdrop src={BEAR} />
      </>
    )
    const next = current(container)!
    fireEvent.load(next)
    expect(next.style.transition).toBe('none')

    act(() => { vi.advanceTimersByTime(0) })
    expect(images(container)).toHaveLength(1)
    expect(current(container)).toHaveAttribute('src', BEAR_780)
  })

  it('fades the painted node out and brings the radial back when the last registration unmounts', () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    const { container, rerender } = render(
      <>
        <AmbientHost />
        <AmbientBackdrop src={SEVERANCE} />
      </>
    )
    const painted = current(container)!
    fireEvent.load(painted)
    expect(radial(container).style.opacity).toBe('0')

    rerender(<AmbientHost />)
    const [outgoing] = images(container)
    // The same node, so the opacity change is a transition and not a cut.
    expect(outgoing).toBe(painted)
    expect(outgoing.style.opacity).toBe('0')
    expect(outgoing.style.transition).toContain('opacity')
    expect(radial(container).style.opacity).toBe('1')

    act(() => { vi.advanceTimersByTime(400) })
    expect(images(container)).toHaveLength(0)
    expect(radial(container).style.opacity).toBe('1')
  })
})
