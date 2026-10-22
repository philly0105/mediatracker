import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RatingStars from '@/components/RatingStars'

// `var(--rating)` with its closing paren: `--rating` alone would also match the
// empty star's `var(--rating-empty)`.
const FILLED = 'svg[style*="var(--rating)"]'
const EMPTY = 'svg[style*="var(--rating-empty)"]'

describe('RatingStars', () => {
  it('renders a single native range slider across the star row', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: 'Rating' })
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '5')
    expect(slider).toHaveAttribute('step', '0.5')
  })

  it('calls onChange with 0.5 when first half selected', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '0.5' } })
    // Drag-spam guard: changing local preview must not commit immediately
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.blur(slider)
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('calls onChange with 3.5 when correct rating selected', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '3.5' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.blur(slider)
    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it('renders filled stars for current value', () => {
    const { container } = render(<RatingStars value={3.5} onChange={vi.fn()} />)
    // The fill lives on the overlay <Star>, clipped by a wrapper whose width is
    // 100% for a full star and 50% for a half. 3.5 means three full and one half.
    const overlays = Array.from(container.querySelectorAll('span[style*="width"]'))
    expect(overlays.map(o => (o as HTMLElement).style.width)).toEqual([
      '100%', '100%', '100%', '50%',
    ])
    expect(container.querySelectorAll(FILLED)).toHaveLength(4)
  })

  it('paints filled stars gold and empty stars with the translucent empty token', () => {
    const { container } = render(<RatingStars value={2} readOnly />)
    // Five translucent shapes underneath, two gold fills on top. The empty star
    // is filled, not just outlined: at 12px an outline alone is invisible.
    const empty = container.querySelectorAll<SVGElement>(EMPTY)
    expect(empty).toHaveLength(5)
    expect(empty[0].style.fill).toBe('var(--rating-empty)')
    expect(container.querySelectorAll(FILLED)).toHaveLength(2)
  })

  it('renders 12px glyphs for the caption size and 24px by default', () => {
    const { container, rerender } = render(<RatingStars value={4} readOnly size="sm" />)
    expect(container.querySelectorAll('svg.w-3.h-3')).toHaveLength(9)
    expect(container.querySelectorAll('svg.w-6.h-6')).toHaveLength(0)

    rerender(<RatingStars value={4} readOnly />)
    expect(container.querySelectorAll('svg.w-6.h-6')).toHaveLength(9)
  })

  it('does not call onChange when readOnly and renders no interactive control', () => {
    const onChange = vi.fn()
    render(<RatingStars value={4} onChange={onChange} readOnly />)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('slider has accessible label and natural aria-valuetext', () => {
    const { rerender } = render(<RatingStars value={null} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: 'Rating' })
    expect(slider).toHaveAttribute('aria-valuetext', 'Not rated')

    rerender(<RatingStars value={1} onChange={vi.fn()} />)
    expect(slider).toHaveAttribute('aria-valuetext', '1 star')

    rerender(<RatingStars value={3.5} onChange={vi.fn()} />)
    expect(slider).toHaveAttribute('aria-valuetext', '3.5 stars')
  })

  it('reports null to onChange when set to 0', () => {
    const onChange = vi.fn()
    render(<RatingStars value={4.0} onChange={onChange} />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '0' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.blur(slider)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('clears rating to null when clicking clear rating button', () => {
    const onChange = vi.fn()
    const { rerender } = render(<RatingStars value={null} onChange={onChange} />)
    expect(screen.queryByRole('button', { name: 'Clear rating' })).not.toBeInTheDocument()

    rerender(<RatingStars value={2.5} onChange={onChange} />)
    const clearButton = screen.getByRole('button', { name: 'Clear rating' })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('updates live star preview on change and resets on blur', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingStars value={null} onChange={onChange} />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '3' } })
    expect(container.querySelectorAll(FILLED)).toHaveLength(3)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.blur(slider)
    expect(onChange).toHaveBeenCalledWith(3)
    expect(container.querySelectorAll(FILLED)).toHaveLength(0)
  })
})
