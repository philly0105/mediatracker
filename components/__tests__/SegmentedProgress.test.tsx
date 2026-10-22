import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'

function segmentEls(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-segment]'))
}

function segments(container: HTMLElement) {
  return segmentEls(container).map((s) => s.dataset.segment)
}

describe('SegmentedProgress', () => {
  it('is an image named after the count, with the count repeated visually', () => {
    render(<SegmentedProgress value={2} max={10} />)
    expect(screen.getByRole('img', { name: '2 of 10 episodes watched' })).toBeInTheDocument()
    expect(screen.getByText('2 of 10')).toHaveAttribute('aria-hidden', 'true')
  })

  it('takes a custom aria-label and can drop the count', () => {
    render(<SegmentedProgress value={2} max={10} aria-label="2 of 10 chapters read" count={false} />)
    expect(screen.getByRole('img', { name: '2 of 10 chapters read' })).toBeInTheDocument()
    expect(screen.queryByText('2 of 10')).not.toBeInTheDocument()
  })

  it('marks watched segments, the next one and the rest', () => {
    const { container } = render(<SegmentedProgress value={2} max={5} />)
    expect(segments(container)).toEqual(['watched', 'watched', 'next', 'unwatched', 'unwatched'])
  })

  it('paints each state on its token, with a system colour for forced colours', () => {
    const { container } = render(<SegmentedProgress value={2} max={5} />)
    const [watched, , next, unwatched] = segmentEls(container)
    // The fills are classes, not inline styles, so the forced-colours variant
    // can replace them; inline backgrounds would flatten to Canvas.
    expect(watched.className).toContain('bg-[var(--accent)]')
    expect(watched.className).toContain('forced-colors:bg-[color:Highlight]')
    expect(next.className).toContain('bg-[var(--accent-tint)]')
    expect(next.className).toContain('forced-colors:bg-[color:GrayText]')
    expect(unwatched.className).toContain('bg-[var(--progress-track)]')
    expect(unwatched.className).toContain('forced-colors:bg-[color:GrayText]')
    expect(watched.style.background).toBe('')
  })

  it('has no "next" segment once every episode is watched, and none watched at zero', () => {
    const { container, rerender } = render(<SegmentedProgress value={3} max={3} />)
    expect(segments(container)).toEqual(['watched', 'watched', 'watched'])

    rerender(<SegmentedProgress value={0} max={3} />)
    expect(segments(container)).toEqual(['next', 'unwatched', 'unwatched'])
  })

  it('clamps a value past the maximum', () => {
    const { container } = render(<SegmentedProgress value={9} max={4} />)
    expect(segments(container)).toHaveLength(4)
    expect(segments(container).every((s) => s === 'watched')).toBe(true)
    expect(screen.getByText('4 of 4')).toBeInTheDocument()
  })

  it('falls back to one continuous bar past 24 episodes', () => {
    const { container } = render(<SegmentedProgress value={30} max={60} />)
    expect(segments(container)).toHaveLength(0)
    expect(screen.getByRole('img', { name: '30 of 60 episodes watched' })).toBeInTheDocument()
    const fill = container.querySelector<HTMLElement>('[data-progress-fill]')!
    expect(fill.style.width).toBe('50%')
    expect(fill.className).toContain('bg-[var(--accent)]')
    expect(fill.className).toContain('forced-colors:bg-[color:Highlight]')
    expect(fill.parentElement!.className).toContain('bg-[var(--progress-track)]')
    expect(screen.getByText('30 of 60')).toBeInTheDocument()
  })

  it('still renders segments at exactly 24', () => {
    const { container } = render(<SegmentedProgress value={1} max={24} />)
    expect(segments(container)).toHaveLength(24)
  })

  it('draws an empty track, not nothing, when there is nothing to count', () => {
    // A season with no aired episodes: zero segments left a gap in the header.
    const { container } = render(<SegmentedProgress value={0} max={0} />)
    expect(segments(container)).toHaveLength(0)
    const track = screen.getByRole('img', { name: '0 of 0 episodes watched' })
    expect(track.className).toContain('bg-[var(--progress-track)]')
    expect(track.style.height).toBe('4px')
    expect(container.querySelector<HTMLElement>('[data-progress-fill]')!.style.width).toBe('0%')
    expect(screen.getByText('0 of 0')).toBeInTheDocument()
  })
})
