import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MediaRow } from '@/components/ui/MediaRow'

describe('MediaRow', () => {
  it('takes the interactive hover class only when it is clickable', () => {
    const { rerender } = render(<MediaRow title="Severance" type="show" />)
    expect(screen.getByText('Severance').closest('.glass-row')!.className).toBe('glass-row glass-rim')

    rerender(<MediaRow title="Severance" type="show" onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Severance' }).className)
      .toBe('glass-row glass-rim media-row-interactive')
  })

  it('pins both sides of the poster thumb', () => {
    render(<MediaRow title="Past Lives" posterUrl="https://image.tmdb.org/t/p/w185/a.jpg" />)
    const img = screen.getByRole('img', { name: 'Past Lives' })
    expect(img.style.width).toBe('60px')
    expect(img.style.height).toBe('90px')
  })

  it('shapes the placeholder from thumbShape, falling back to whether a still was given', () => {
    const { container, rerender } = render(<MediaRow title="Episode 3" type="show" />)
    const placeholder = () => container.querySelector('.glass-row')!.firstElementChild as HTMLElement
    // No art and no shape: today's 60x90 poster placeholder.
    expect(placeholder().style.width).toBe('60px')
    expect(placeholder().className).toBe('')

    // An episode list asks for the still's 16:9 shape even with no still.
    rerender(<MediaRow title="Episode 3" type="show" thumbShape="still" />)
    expect(placeholder().style.width).toBe('')
    expect(placeholder().className).toContain('md:w-40')

    rerender(<MediaRow title="Episode 3" type="show" thumbShape="poster" />)
    expect(placeholder().style.width).toBe('60px')
  })
})
