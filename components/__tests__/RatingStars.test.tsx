import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RatingStars from '@/components/RatingStars'

describe('RatingStars', () => {
  it('renders 10 half-star click zones', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)
    expect(document.querySelectorAll('[data-half]')).toHaveLength(10)
  })

  it('calls onChange with 0.5 when first half clicked', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    fireEvent.click(document.querySelector('[data-half="0.5"]')!)
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('calls onChange with 3.5 when correct half clicked', () => {
    const onChange = vi.fn()
    render(<RatingStars value={null} onChange={onChange} />)
    fireEvent.click(document.querySelector('[data-half="3.5"]')!)
    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it('renders filled stars for current value', () => {
    const { container } = render(<RatingStars value={3.5} onChange={vi.fn()} />)
    const stars = container.querySelectorAll('span')
    const filledStars = Array.from(stars).filter(s => s.style.color === 'var(--amber-400)')
    expect(filledStars.length).toBeGreaterThan(0)
  })

  it('does not call onChange when readOnly', () => {
    const onChange = vi.fn()
    render(<RatingStars value={4} onChange={onChange} readOnly />)
    // Read-only renders no hit areas at all, so there is nothing to click.
    expect(document.querySelectorAll('[data-half]')).toHaveLength(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hit areas are labeled buttons', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Rate 0.5 stars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rate 5 stars' })).toBeInTheDocument()
  })

  it('read-only renders no interactive hit areas', () => {
    render(<RatingStars value={3.5} readOnly />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('img', { name: 'Rated 3.5 out of 5' })).toBeInTheDocument()
  })
})
