import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StreamingRow } from '../title/StreamingRow'

vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, unoptimized, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; unoptimized?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' ? src : ''}
      alt={alt ?? ''}
      data-fill={fill ? 'true' : undefined}
      data-sizes={sizes}
      data-preload={preload ? 'true' : 'false'}
      data-unoptimized={unoptimized ? 'true' : undefined}
      {...props}
    />
  ),
}))

describe('StreamingRow', () => {
  it('renders nothing without a provider', () => {
    const { container } = render(<StreamingRow provider={null} link="https://www.themoviedb.org/tv/1/watch" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the provider with its logo and the attribution link', () => {
    const { container } = render(
      <StreamingRow
        provider={{ name: 'Apple TV+', logoUrl: 'https://image.tmdb.org/t/p/w500/apple.jpg' }}
        link="https://www.themoviedb.org/tv/95396/watch"
      />
    )
    expect(screen.getByText('Streaming on')).toBeInTheDocument()
    expect(screen.getByText('Apple TV+')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')

    const link = screen.getByRole('link', { name: /Provided by JustWatch/ })
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/tv/95396/watch')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('falls back to an icon without a logo and skips the link without one', () => {
    const { container } = render(<StreamingRow provider={{ name: 'Netflix' }} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
