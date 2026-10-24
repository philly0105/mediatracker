import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MediaInfoModal from '../MediaInfoModal'
import { ToastProvider } from '../ToastProvider'
import type { TmdbSearchResult } from '@/types'




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

  it('gives an unwatched movie exactly one solid button, and it is Mark as watched', async () => {
    mockDetails({ ...movie })
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Mark as watched')
    // Before F-36 every one of these was Button's default `primary`.
    expect(solidButtons()).toEqual(['Mark as watched'])
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

  it('styles Remove from watchlist as destructive rather than primary', async () => {
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

    const remove = (await screen.findByText('Remove from watchlist')).closest('button')!
    // It used to be solid pine that only turned red on hover, via
    // `hover:!bg-rose-600` beating the component's own hover through !important.
    expect(remove).toHaveClass('btn-ghost')
    expect(remove).toHaveClass('btn-tone-destructive')
    expect(remove).not.toHaveClass('btn-primary')
  })

  it('promotes Track Episodes over Mark as watched for a trackable show', async () => {
    mockDetails({ ...show, media_id: 'media-1' })
    render(
      <ToastProvider>
        <MediaInfoModal item={show} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Track Episodes')
    expect(solidButtons()).toEqual(['Track Episodes'])
    expect(screen.getByText('Mark as watched').closest('button')).toHaveClass('btn-ghost')
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

// The hero took over the score, which used to double as the IMDb link, and
// StreamingRow took over the JustWatch attribution, which it only renders with
// a provider. Both links are the modal's own responsibility now.
describe('MediaInfoModal external links', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('links to the IMDb page when the details carry an imdb id', async () => {
    mockDetails({ ...movie, imdb_id: 'tt0113277' })
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    const imdb = await screen.findByRole('link', { name: 'IMDb' })
    expect(imdb).toHaveAttribute('href', 'https://www.imdb.com/title/tt0113277')
    expect(imdb).toHaveAttribute('target', '_blank')
  })

  it('names the dialog by its title heading, even with another one under it', async () => {
    mockDetails({})
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} covered onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
        <MediaInfoModal item={show} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    // MediaModalStack keeps the lower modal mounted, so a shared heading id
    // would name both dialogs after the first one in the document.
    const top = await screen.findByRole('dialog', { name: 'Breaking Bad' })
    const heading = screen.getByRole('heading', { level: 2, name: 'Breaking Bad' })
    expect(top).toHaveAttribute('aria-labelledby', heading.id)
    expect(screen.getByRole('dialog', { name: 'Heat' })).not.toBe(top)
  })

  it('keeps the JustWatch link when nothing streams the title', async () => {
    mockDetails({ ...movie, watch_providers: { link: 'https://www.themoviedb.org/movie/550/watch', flatrate: [] } })
    render(
      <ToastProvider>
        <MediaInfoModal item={movie} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('Not available to stream.')
    expect(screen.getByRole('link', { name: /Provided by JustWatch/ })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/movie/550/watch',
    )
  })
})

describe('MediaInfoModal cast', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows headshots and characters from the credits, after the director', async () => {
    // Its own tmdb_id: the modal caches details per title for the session.
    const heat = { ...movie, tmdb_id: 949 }
    mockDetails({
      ...heat,
      director: 'Michael Mann',
      cast_members: ['Al Pacino'],
      cast_credits: [
        { name: 'Al Pacino', character: 'Vincent Hanna', profile_url: 'https://image.tmdb.org/t/p/w185/pacino.jpg' },
        { name: 'Michael Mann', character: null, profile_url: null },
      ],
    })
    render(
      <ToastProvider>
        <MediaInfoModal item={heat} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    const pacino = await screen.findByRole('link', { name: /Al Pacino/ })
    expect(pacino).toHaveTextContent('Vincent Hanna')
    expect(pacino.querySelector('img')?.getAttribute('src')).toContain(
      encodeURIComponent('https://image.tmdb.org/t/p/w185/pacino.jpg'),
    )
    // An actor-director is listed once, as the director.
    const people = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/person/'))
    expect(people.map((a) => a.getAttribute('href'))).toEqual(['/person/Michael%20Mann', '/person/Al%20Pacino'])
    expect(people[0]).toHaveTextContent('Director')
  })

  it('falls back to the names when the credits are missing', async () => {
    const ronin = { ...movie, tmdb_id: 8195, title: 'Ronin' }
    mockDetails({ ...ronin, cast_members: ['Robert De Niro'] })
    render(
      <ToastProvider>
        <MediaInfoModal item={ronin} onClose={vi.fn()} onAddToWatchlist={vi.fn()} onMarkAsWatched={vi.fn()} />
      </ToastProvider>,
    )

    expect(await screen.findByRole('link', { name: /Robert De Niro/ })).toHaveAttribute('href', '/person/Robert%20De%20Niro')
  })
})
