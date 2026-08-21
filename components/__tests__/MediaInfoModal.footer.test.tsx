import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MediaInfoModal from '../MediaInfoModal'
import { ToastProvider } from '../ToastProvider'
import type { TmdbSearchResult } from '@/types'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
}

function stripMotionProps({ ...props }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete props.initial
  delete props.animate
  delete props.exit
  delete props.transition
  return props
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: (props: MotionDivProps) => <div {...stripMotionProps(props)} />,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

const movie: TmdbSearchResult = {
  tmdb_id: 550,
  type: 'movie',
  title: 'Heat',
  overview: 'A movie',
  poster_url: null,
  release_year: 1995,
}

const show: TmdbSearchResult = { ...movie, tmdb_id: 1396, type: 'show', title: 'Breaking Bad' }

const mockFetch = vi.fn()

function mockDetails(over: Record<string, unknown>) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      isWatched: false,
      isWatchlisted: false,
      isFollowed: false,
      watch_entry: null,
      director: null,
      cast_members: [],
      genres: [],
      runtime_mins: 170,
      trailer_url: null,
      watch_providers: null,
      vote_average: 8.3,
      ...over,
    }),
  })
}

/** The footer is the only place these variant classes are used. */
function footer() {
  return document.querySelector('.border-t.flex.gap-3') as HTMLElement
}

function solidButtons() {
  return Array.from(document.querySelectorAll('.btn-primary')).map(b => b.textContent?.trim())
}

describe('MediaInfoModal footer hierarchy (F-36)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives an unwatched movie exactly one solid button, and it is Mark as Watched', async () => {
    mockDetails({ ...movie })
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Mark as Watched')
    // Before F-36 every one of these was Button's default `primary`.
    expect(solidButtons()).toEqual(['Mark as Watched'])
  })

  it('leaves nothing solid once the film has been watched', async () => {
    mockDetails({ ...movie, isWatched: true })
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Log rewatch')
    // There is no next action to point at, so no button claims primary.
    expect(solidButtons()).toEqual([])
    expect(screen.getByText('Log rewatch').closest('button')).toHaveClass('btn-tone-success')
  })

  it('styles Remove from Watchlist as destructive rather than primary', async () => {
    mockDetails({ ...movie, isWatchlisted: true })
    render(
      <ToastProvider>
        <MediaInfoModal
          item={movie}
          onClose={vi.fn()}
          onAddToWatchlist={vi.fn()}
          onMarkAsWatched={vi.fn()}
          onRemoveFromWatchlist={vi.fn()}
        />
      </ToastProvider>,
    )

    const remove = (await screen.findByText('Remove from Watchlist')).closest('button')!
    // It used to be solid pine that only turned red on hover, via
    // `hover:!bg-rose-600` beating the component's own hover through !important.
    expect(remove).toHaveClass('btn-ghost')
    expect(remove).toHaveClass('btn-tone-destructive')
    expect(remove).not.toHaveClass('btn-primary')
  })

  it('promotes Track Episodes over Mark as Watched for a trackable show', async () => {
    mockDetails({ ...show, media_id: 'media-1' })
    render(
      <ToastProvider>
        <MediaInfoModal item={show} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Track Episodes')
    expect(solidButtons()).toEqual(['Track Episodes'])
    expect(screen.getByText('Mark as Watched').closest('button')).toHaveClass('btn-ghost')
  })

  it('never falls back to !important hover overrides', async () => {
    mockDetails({ ...show, media_id: 'media-1', isWatchlisted: true, isFollowed: true })
    render(
      <ToastProvider>
        <MediaInfoModal
          item={show}
          onClose={vi.fn()}
          onAddToWatchlist={vi.fn()}
          onMarkAsWatched={vi.fn()}
          onRemoveFromWatchlist={vi.fn()}
        />
      </ToastProvider>,
    )

    await screen.findByText('Track Episodes')
    // F-27: `hover:!bg-*` beat `.btn-*`'s own hover, leaving two hover systems
    // with one of them inert. Tone props replaced all five call sites.
    expect(footer().innerHTML).not.toMatch(/hover:!/)
  })
})
