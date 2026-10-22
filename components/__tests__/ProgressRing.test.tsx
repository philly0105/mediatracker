import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressRing } from '@/components/ui/ProgressRing'

function circles(container: HTMLElement) {
  return Array.from(container.querySelectorAll('circle'))
}

describe('ProgressRing', () => {
  it('is an image named after the count it shows', () => {
    render(<ProgressRing value={6} max={10} label="S2" />)
    const ring = screen.getByRole('img', { name: '6 of 10 episodes watched' })
    expect(ring).toBeInTheDocument()
    expect(ring).toHaveTextContent('S2')
    // The svg is decorative; the role and name live on the wrapper.
    expect(ring.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('takes a custom aria-label', () => {
    render(<ProgressRing value={3} max={4} aria-label="3 of 4 films in the series watched" />)
    expect(screen.getByRole('img', { name: '3 of 4 films in the series watched' })).toBeInTheDocument()
  })

  it('defaults to 48px with a 4px stroke and takes the hero sizes', () => {
    const { container, rerender } = render(<ProgressRing value={1} max={2} />)
    let svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '48')
    expect(circles(container)[0]).toHaveAttribute('stroke-width', '4')

    rerender(<ProgressRing value={1} max={2} size={52} stroke={5} />)
    svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '52')
    expect(svg).toHaveAttribute('height', '52')
    expect(circles(container)[0]).toHaveAttribute('stroke-width', '5')
  })

  it('draws the track on the progress token and the fill on the accent', () => {
    const { container } = render(<ProgressRing value={6} max={10} />)
    const [track, fill] = circles(container)
    expect(track).toHaveAttribute('stroke', 'var(--progress-track)')
    expect(fill).toHaveAttribute('stroke', 'var(--accent)')
    // 60% of the circumference of a 22px-radius ring, less one stroke width
    // because the round caps add half a stroke at each end, and nudged half a
    // stroke along so the arc still starts at twelve o'clock. The gap is longer
    // than the ring so the dash never repeats.
    const [dash, gap] = fill.getAttribute('stroke-dasharray')!.split(' ').map(Number)
    const circumference = 2 * Math.PI * 22
    expect(dash).toBeCloseTo(circumference * 0.6 - 4, 5)
    expect(gap).toBeCloseTo(circumference, 5)
    expect(fill).toHaveAttribute('stroke-dashoffset', '-2')
  })

  it('paints no fill at zero and clamps past the maximum', () => {
    const { container, rerender } = render(<ProgressRing value={0} max={10} />)
    expect(circles(container)).toHaveLength(1)

    // One stroke short of the full circumference: the caps close the ring.
    rerender(<ProgressRing value={12} max={10} />)
    const [, fill] = circles(container)
    const [dash, gap] = fill.getAttribute('stroke-dasharray')!.split(' ').map(Number)
    expect(dash).toBeCloseTo(gap - 4, 5)
  })

  it('never draws a negative dash for a sliver of progress', () => {
    const { container } = render(<ProgressRing value={1} max={1000} />)
    const [, fill] = circles(container)
    const [dash] = fill.getAttribute('stroke-dasharray')!.split(' ').map(Number)
    expect(dash).toBe(0)
  })
})
