import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CastStrip } from '../title/CastStrip'

vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} data-fill={fill ? 'true' : undefined} data-sizes={sizes} data-preload={preload ? 'true' : 'false'} {...props} />
  ),
}))

describe('CastStrip', () => {
  it('links every member to their person page, URL-encoded', () => {
    render(<CastStrip cast={[{ name: 'Adam Scott', character: 'Mark Scout' }, { name: 'Britt Lower' }]} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Cast')
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/person/Adam%20Scott', '/person/Britt%20Lower'])
    expect(screen.getByText('Mark Scout')).toBeInTheDocument()
  })

  it('shows initials without a headshot and a decorative image with one', () => {
    const { container } = render(
      <CastStrip cast={[{ name: 'Adam Scott' }, { name: 'Britt Lower', profileUrl: 'https://image.tmdb.org/t/p/w500/bl.jpg' }]} />
    )
    expect(screen.getByText('AS')).toBeInTheDocument()
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/bl.jpg')
    expect(img).toHaveAttribute('alt', '')
  })

  it('renders nothing for an empty cast', () => {
    const { container } = render(<CastStrip cast={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens links in a new tab only when asked', () => {
    const { rerender } = render(<CastStrip cast={[{ name: 'Adam Scott' }]} />)
    expect(screen.getByRole('link')).not.toHaveAttribute('target')

    rerender(<CastStrip cast={[{ name: 'Adam Scott' }]} newTabLinks />)
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
