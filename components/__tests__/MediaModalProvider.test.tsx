import React, { Suspense, useEffect } from 'react'
import type { ComponentType } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MediaModalProvider, useMediaModal } from '../MediaModalProvider'
import { ToastProvider } from '../ToastProvider'
import { AmbientHost } from '../AmbientBackdrop'
import type { TmdbSearchResult } from '@/types'

vi.mock('next/dynamic', () => ({
  default: <P extends object>(
    loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
    options?: { loading?: ComponentType<unknown>; ssr?: boolean }
  ) => {
    const LazyComponent = React.lazy(async () => {
      const mod = await loader()
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod as { default: ComponentType<P> }
      }
      return { default: mod as ComponentType<P> }
    })

    return function DynamicComponent(props: P) {
      const Loading = options?.loading
      return (
        <Suspense fallback={Loading ? <Loading /> : null}>
          <LazyComponent {...props} />
        </Suspense>
      )
    }
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

const heat: TmdbSearchResult = {
  tmdb_id: 550,
  type: 'movie',
  title: 'Heat',
  overview: 'A movie',
  poster_url: null,
  release_year: 1995,
}

const bb: TmdbSearchResult = { ...heat, tmdb_id: 1396, type: 'show', title: 'Breaking Bad' }

const mockFetch = vi.fn()

function detailsResponse(over: Record<string, unknown> = {}) {
  return {
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
  }
}

function bodyOf(call: unknown[]): Record<string, unknown> {
  return JSON.parse((call[1] as { body: string }).body)
}

/** Renders a host that exposes the context so tests can drive it directly. */
function renderHost(extra?: React.ReactNode) {
  const api: { open: ReturnType<typeof useMediaModal>['openMedia'] | null } = { open: null }

  function Host() {
    const { openMedia } = useMediaModal()
    // Published from an effect, not during render — the context is stable, so
    // this runs once and never fights React over render-phase side effects.
    useEffect(() => { api.open = openMedia }, [openMedia])
    return null
  }

  render(
    <ToastProvider>
      <MediaModalProvider>
        <Host />
        {extra}
      </MediaModalProvider>
    </ToastProvider>,
  )

  return api as { open: NonNullable<typeof api.open> }
}

function dialogs() {
  return Array.from(document.querySelectorAll('[role="dialog"]'))
}

describe('MediaModalProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) =>
      url.startsWith('/api/media/') || url.includes('details') ? detailsResponse() : { ok: true, json: async () => ({}) },
    )
    global.fetch = mockFetch as unknown as typeof fetch
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a modal and closes it again', async () => {
    const host = renderHost()

    await act(async () => { host.open(heat) })
    expect(await screen.findByText('Heat')).toBeTruthy()

    await act(async () => { fireEvent.click(screen.getByLabelText('Close')) })
    // Held on screen while .dialog-out plays, then dropped.
    await waitFor(() => expect(screen.queryByText('Heat')).toBeNull())
  })

  // SimilarModal opens a MediaInfoModal from inside a MediaInfoModal. A single
  // slot would replace the one underneath and closing the top would leave
  // nothing behind it.
  it('stacks nested modals and pops one at a time', async () => {
    const host = renderHost()

    await act(async () => { host.open(heat) })
    await screen.findByText('Heat')
    await act(async () => { host.open(bb) })
    await screen.findByText('Breaking Bad')

    expect(dialogs().length).toBe(2)

    // The topmost close button belongs to the modal opened last.
    const closes = screen.getAllByLabelText('Close')
    await act(async () => { fireEvent.click(closes[closes.length - 1]) })

    await waitFor(() => expect(dialogs().length).toBe(1))
    expect(screen.queryByText('Breaking Bad')).toBeNull()
    expect(screen.queryByText('Heat')).toBeTruthy()
  })

  // Spec §5.2: blur is budgeted per viewport. A modal is two blurred surfaces
  // (sheet and hero slab; the hero frame inside the sheet never blurs), so
  // the one underneath a stacked modal gives its blur up until it is on top
  // again.
  it('drops the blur on a modal while another is stacked over it', async () => {
    const host = renderHost()

    await act(async () => { host.open(heat) })
    await screen.findByText('Heat')
    await act(async () => { host.open(bb) })
    await screen.findByText('Breaking Bad')

    // The drop sits on the dialog itself: the sheet and the slab inside it
    // lose their blur, nothing rendered beside it does.
    const [under, top] = dialogs()
    expect(under.className).toMatch(/backdrop-filter:none/)
    expect(top.className).not.toMatch(/backdrop-filter:none/)
    // The hero frame's blur is dropped on the scroll area whether or not the
    // modal is covered: a panel inside a blurred sheet has only the sheet's
    // flat fill behind it.
    expect(top.querySelector('.overflow-y-auto')?.className).toMatch(/\[&_\.glass-panel\]:\[backdrop-filter:none\]/)

    const closes = screen.getAllByLabelText('Close')
    await act(async () => { fireEvent.click(closes[closes.length - 1]) })

    await waitFor(() => expect(dialogs().length).toBe(1))
    expect(dialogs()[0].className).not.toMatch(/backdrop-filter:none/)
  })

  // Spec §5.6: "Ambient = this title". The page's own registration survives
  // underneath and paints again once the modal has gone.
  it('hands the ambient layer the open title and gives it back on close', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('details')
        ? detailsResponse({ backdrop_url: 'https://image.tmdb.org/t/p/w1280/heat.jpg' })
        : { ok: true, json: async () => ({}) },
    )
    const host = renderHost(<AmbientHost />)
    const ambientSrc = () => document.querySelector('img.ambient-img')?.getAttribute('src') ?? null

    expect(ambientSrc()).toBeNull()
    await act(async () => { host.open(heat) })
    await screen.findByText('Heat')
    await waitFor(() => expect(ambientSrc()).toBe('https://image.tmdb.org/t/p/w780/heat.jpg'))

    await act(async () => { fireEvent.click(screen.getByLabelText('Close')) })
    await waitFor(() => expect(ambientSrc()).toBeNull())
  })

  // The ⌘K overlay takes focus back in onClosed. Firing it at close time rather
  // than on exit-complete puts focus on an element that is still animating away,
  // so the test asserts the modal is already gone from the DOM when it runs.
  it('runs onClosed only once the modal has finished animating out', async () => {
    let dialogsWhenCalled = -1
    const onClosed = vi.fn(() => { dialogsWhenCalled = dialogs().length })
    const host = renderHost()

    await act(async () => { host.open(heat, { onClosed }) })
    await screen.findByText('Heat')
    expect(onClosed).not.toHaveBeenCalled()

    await act(async () => { fireEvent.click(screen.getByLabelText('Close')) })
    // Closed, but still mounted playing .dialog-out.
    expect(onClosed).not.toHaveBeenCalled()
    expect(dialogs().length).toBe(1)

    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1))
    expect(dialogsWhenCalled).toBe(0)
  })

  it('sends the caller-supplied priority when adding to the watchlist', async () => {
    const onChanged = vi.fn()
    const host = renderHost()

    await act(async () => { host.open(heat, { priority: 'must_watch', onChanged }) })
    await act(async () => { fireEvent.click(await screen.findByText('Add to Watchlist')) })

    const post = mockFetch.mock.calls.find(
      (c) => c[0] === '/api/watchlist' && (c[1] as { method: string }).method === 'POST',
    )
    expect(post).toBeTruthy()
    expect(bodyOf(post!)).toMatchObject({ tmdb_id: 550, type: 'movie', priority: 'must_watch' })
    expect(onChanged).toHaveBeenCalledWith('watchlisted', heat)
  })

  it('defaults to want_to_watch when the caller does not say', async () => {
    const host = renderHost()

    await act(async () => { host.open(heat) })
    await act(async () => { fireEvent.click(await screen.findByText('Add to Watchlist')) })

    const post = mockFetch.mock.calls.find(
      (c) => c[0] === '/api/watchlist' && (c[1] as { method: string }).method === 'POST',
    )
    expect(bodyOf(post!)).toMatchObject({ priority: 'want_to_watch' })
  })

  it('lets a caller replace a default handler outright', async () => {
    const onAddToWatchlist = vi.fn(async () => {})
    const onChanged = vi.fn()
    const host = renderHost()

    await act(async () => { host.open(heat, { onAddToWatchlist, onChanged }) })
    await act(async () => { fireEvent.click(await screen.findByText('Add to Watchlist')) })

    expect(onAddToWatchlist).toHaveBeenCalled()
    // The override owns the side effect; onChanged belongs to the default path.
    expect(onChanged).not.toHaveBeenCalled()
    expect(
      mockFetch.mock.calls.some((c) => c[0] === '/api/watchlist' && (c[1] as { method: string }).method === 'POST'),
    ).toBe(false)
  })
})

// F-37/F-38. Twelve of the thirteen hand-wired call sites forgot the wrapper
// MediaInfoModal's exit animation needs, so the modal cut out instead of
// animating. The fix only holds while the provider stays the sole owner — a new
// direct import quietly reintroduces the bug.
describe('MediaInfoModal ownership', () => {
  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) sourceFiles(full, acc)
      else if (/\.tsx?$/.test(name)) acc.push(full)
    }
    return acc
  }

  it('is imported by MediaModalStack and nothing else', () => {
    const root = join(__dirname, '..', '..')
    const offenders = ['app', 'components', 'lib']
      .flatMap((d) => sourceFiles(join(root, d)))
      .filter((f) => !/[/\\]components[/\\](MediaInfoModal|MediaModalStack)\.tsx$/.test(f))
      .filter((f) => /^\s*import .*['"].*\/MediaInfoModal['"]/m.test(readFileSync(f, 'utf-8')))
      .map((f) => f.slice(root.length + 1))

    expect(offenders).toEqual([])
  })

  it('renders the modal stack through Presence', () => {
    const src = readFileSync(join(__dirname, '..', 'MediaModalStack.tsx'), 'utf-8')
    expect(src).toContain('<MediaInfoModal')
    expect(src).toMatch(/<Presence[^>]*onExitComplete/)
  })
})
