import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MoreLikeThisRail } from '../title/MoreLikeThisRail'
import type { TmdbSearchResult } from '@/types'

vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} data-fill={fill ? 'true' : undefined} data-sizes={sizes} data-preload={preload ? 'true' : 'false'} {...props} />
  ),
}))

const items: TmdbSearchResult[] = [
  { tmdb_id: 1, type: 'show', title: 'Pluribus', overview: '', poster_url: 'https://image.tmdb.org/t/p/w500/p.jpg', release_year: 2025 },
  { tmdb_id: 2, type: 'show', title: 'Andor', overview: '', poster_url: null, release_year: 2022 },
]

describe('MoreLikeThisRail', () => {
  it('renders a poster per item under the header and hands the item back on click', () => {
    const onSelect = vi.fn()
    render(<MoreLikeThisRail items={items} onSelect={onSelect} />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('More like this')
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByText('2025')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Andor/ }))
    expect(onSelect).toHaveBeenCalledWith(items[1])
  })

  it('takes a custom title and renders nothing without items', () => {
    const { container, rerender } = render(<MoreLikeThisRail items={items} onSelect={vi.fn()} title="Because you watched Severance" />)
    expect(screen.getByText('Because you watched Severance')).toBeInTheDocument()

    rerender(<MoreLikeThisRail items={[]} onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
