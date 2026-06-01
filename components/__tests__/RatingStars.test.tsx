import { render, fireEvent } from '@testing-library/react'
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
    const filled = container.querySelectorAll('.text-yellow-400')
    expect(filled.length).toBeGreaterThan(0)
  })

  it('does not call onChange when readOnly', () => {
    const onChange = vi.fn()
    render(<RatingStars value={4} onChange={onChange} readOnly />)
    fireEvent.click(document.querySelector('[data-half="1.0"]')!)
    expect(onChange).not.toHaveBeenCalled()
  })
})
