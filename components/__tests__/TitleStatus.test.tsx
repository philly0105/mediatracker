import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TitleStatus } from '../title/TitleStatus'

vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} data-fill={fill ? 'true' : undefined} data-sizes={sizes} data-preload={preload ? 'true' : 'false'} {...props} />
  ),
}))

describe('TitleStatus progress', () => {
  it('shows the season ring, the counts and the next episode', () => {
    const { container } = render(
      <TitleStatus
        status={{
          kind: 'progress',
          seasonNumber: 2,
          seasonWatched: 6,
          seasonTotal: 10,
          watched: 15,
          total: 19,
          minutesLeft: 222,
          next: {
            seasonNumber: 2,
            episodeNumber: 7,
            name: 'Chikhai Bardo',
            stillUrl: 'https://image.tmdb.org/t/p/w300/still.jpg',
            runtimeMins: 53,
            airDate: '2025-02-27',
            unaired: false,
          },
        }}
      />
    )

    expect(screen.getByRole('img', { name: '6 of 10 episodes watched in season 2' })).toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()
    expect(screen.getByText('6 of 10 episodes watched')).toBeInTheDocument()
    // One text run, so the show page's "15/19 episodes" assertion keeps working.
    expect(screen.getByText('15/19 episodes · 4 left this season · 3h 42m to go')).toBeInTheDocument()
    expect(screen.getByText('Next · S2 · E7')).toBeInTheDocument()
    expect(screen.getByText('Chikhai Bardo')).toBeInTheDocument()
    expect(screen.getByText('53m · Aired Feb 27, 2025')).toBeInTheDocument()
    // The still is decorative: the card already names the episode.
    const still = container.querySelector('img')
    expect(still).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w300/still.jpg')
    expect(still).toHaveAttribute('alt', '')
  })

  it('says when the next episode has not aired', () => {
    render(
      <TitleStatus
        status={{
          kind: 'progress',
          seasonNumber: 3,
          seasonWatched: 0,
          seasonTotal: 10,
          watched: 19,
          total: 29,
          next: { seasonNumber: 3, episodeNumber: 1, airDate: '2026-11-05', unaired: true },
        }}
      />
    )
    expect(screen.getByText('Airs Nov 5, 2026')).toBeInTheDocument()
    // No name yet: the number stands in.
    expect(screen.getByText('Episode 1')).toBeInTheDocument()
    expect(screen.queryByText(/to go/)).not.toBeInTheDocument()
    // Everything that has aired is watched, which the old page called out.
    expect(screen.getByText('All caught up · S3 · E1')).toBeInTheDocument()
    expect(screen.queryByText(/^Next ·/)).not.toBeInTheDocument()
  })

  it('shrinks the next-episode still under the content breakpoint', () => {
    const { container } = render(
      <TitleStatus
        status={{
          kind: 'progress', seasonNumber: 2, seasonWatched: 6, seasonTotal: 10, watched: 15, total: 19,
          next: { seasonNumber: 2, episodeNumber: 7, stillUrl: 'https://image.tmdb.org/t/p/w300/still.jpg' },
        }}
      />
    )
    // 96x64 on phones, the reference's 128x72 from md up.
    expect(container.querySelector('img')?.parentElement).toHaveClass('h-16', 'w-24', 'md:h-[72px]', 'md:w-32')
  })

  it('reads as caught up once there is nothing left', () => {
    render(
      <TitleStatus
        status={{ kind: 'progress', seasonNumber: 2, seasonWatched: 10, seasonTotal: 10, watched: 19, total: 19, next: null }}
      />
    )
    expect(screen.getByText('19/19 episodes · All caught up')).toBeInTheDocument()
    expect(screen.queryByText(/Next ·/)).not.toBeInTheDocument()
  })
})

describe('TitleStatus watched', () => {
  it('shows the date and editable stars when it can rate', () => {
    const onRate = vi.fn()
    render(<TitleStatus status={{ kind: 'watched', watchedAt: '2026-08-20', rating: 4, onRate }} />)
    expect(screen.getByText('Watched Aug 20, 2026')).toBeInTheDocument()
    const slider = screen.getByRole('slider', { name: 'Rating' })
    expect(slider).toHaveAttribute('aria-valuetext', '4 stars')
    fireEvent.change(slider, { target: { value: '5' } })
    fireEvent.blur(slider)
    expect(onRate).toHaveBeenCalledWith(5)
  })

  it('shows read-only stars and the rewatch note otherwise', () => {
    render(<TitleStatus status={{ kind: 'watched', watchedAt: '2026-08-20', rating: 4, rewatch: true }} />)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument()
    expect(screen.getByText('· Rewatch')).toBeInTheDocument()
  })
})
