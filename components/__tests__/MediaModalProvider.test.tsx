import React, { Suspense, useEffect, useRef, Children } from 'react'
import type { HTMLAttributes, ReactNode, ComponentType } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MediaModalProvider, useMediaModal } from '../MediaModalProvider'
import { ToastProvider } from '../ToastProvider'
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

// A stand-in for AnimatePresence that models the one behaviour these tests care
// about: onExitComplete fires *after* a child has gone, not when close is
// called. Real framer-motion drives that off rAF, which jsdom makes flaky.
function FakeAnimatePresence({
  children,
  onExitComplete,
}: {
  children?: ReactNode
  onExitComplete?: () => void
}) {
  const count = Children.count(children)
  const prev = useRef(count)
  useEffect(() => {
    if (count < prev.current) onExitComplete?.()
    prev.current = count
  })
  return <>{children}</>
}

vi.mock('framer-motion', () => ({
  AnimatePresence: FakeAnimatePresence,
  motion: { div: (props: MotionDivProps) => <div {...stripMotionProps(props)} /> },
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

function detailsResponse() {
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
    }),
  }
}

function bodyOf(call: unknown[]): Record<string, unknown> {
  return JSON.parse((call[1] as { body: string }).body)
}

/** Renders a host that exposes the context so tests can drive it directly. */
function renderHost() {
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
    expect(screen.queryByText('Heat')).toBeNull()
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

    expect(dialogs().length).toBe(1)
    expect(screen.queryByText('Breaking Bad')).toBeNull()
    expect(screen.queryByText('Heat')).toBeTruthy()
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
    expect(onClosed).toHaveBeenCalledTimes(1)
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

// F-37/F-38. Twelve of the thirteen hand-wired call sites forgot the
// AnimatePresence that MediaInfoModal's `exit` prop needs, so the modal cut out
// instead of animating. The fix only holds while the provider stays the sole
// owner — a new direct import quietly reintroduces the bug.
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

  it('renders the modal stack inside an AnimatePresence', () => {
    const src = readFileSync(join(__dirname, '..', 'MediaModalStack.tsx'), 'utf-8')
    expect(src).toMatch(/<AnimatePresence[\s\S]*<MediaInfoModal[\s\S]*<\/AnimatePresence>/)
  })
})
