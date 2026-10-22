import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PosterCard } from '@/components/ui/PosterCard'

vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} data-fill={fill ? 'true' : undefined} data-sizes={sizes} data-preload={preload ? 'true' : 'false'} {...props} />
  ),
}))

// The caption under the poster carries the title, so the art (or the title
// painted into an empty frame) must not name the card a second time.
describe('PosterCard', () => {
  it('names the card once when the poster renders', () => {
    const { container } = render(
      <PosterCard title="Hamnet" year={2025} posterUrl="https://image.tmdb.org/t/p/w500/h.jpg" onClick={vi.fn()} />
    )
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(screen.getByRole('button', { name: 'Hamnet 2025' })).toBeInTheDocument()
  })

  it('names the card once when there is no poster', () => {
    render(<PosterCard title="Hamnet" year={2025} href="/movie/1" />)
    expect(screen.getByRole('link', { name: 'Hamnet 2025' })).toBeInTheDocument()
  })
})
