import type { ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { ToastProvider } from '../ToastProvider'
import { MultiSelectProvider } from '../MultiSelectProvider'
import { MediaModalProvider, useMediaModal } from '../MediaModalProvider'
import type { TmdbSearchResult } from '@/types'

// F-38 moved MediaInfoModal out of thirteen call sites and into MediaModalProvider,
// which renders the stack as a sibling of its own children. That relocated every
// modal *out* of MultiSelectProvider, and MediaInfoModal renders SimilarModal,
// which calls useMultiSelect() — a hook that throws when no provider is above it.
// The throw escapes to the root error boundary, so "Similar Movies" replaced the
// whole app with "Something went wrong".
//
// The nesting is the fix, so the nesting is what these tests pin.


vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/useLibraryIds', () => ({
  useLibraryIds: () => ({
    watchedIds: new Set<string>(),
    watchlistIds: new Set<string>(),
    setWatchedIds: vi.fn(),
    setWatchlistIds: vi.fn(),
  }),
}))

const movie: TmdbSearchResult = {
  tmdb_id: 550, type: 'movie', title: 'Heat', overview: 'A movie',
  poster_url: null, release_year: 1995,
}

function Opener() {
  const { openMedia } = useMediaModal()
  return <button onClick={() => openMedia(movie)}>open</button>
}

/** The provider order from app/(app)/layout.tsx, as a component tree. */
function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <MultiSelectProvider>
        <MediaModalProvider>{children}</MediaModalProvider>
      </MultiSelectProvider>
    </ToastProvider>
  )
}

describe('Similar modal inside the provider-owned modal stack', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/api/tmdb/similar')) {
        return { ok: true, json: async () => [] }
      }
      return {
        ok: true,
        json: async () => ({
          isWatched: false, isWatchlisted: false, isFollowed: false, watch_entry: null,
          director: null, cast_members: [], genres: [], runtime_mins: 170,
          trailer_url: null, watch_providers: null, vote_average: null, media_id: null,
        }),
      }
    }))
    vi.stubGlobal('IntersectionObserver', class {
      observe() {} unobserve() {} disconnect() {}
    })
  })

  it('opens Similar without throwing out to the error boundary', async () => {
    render(<AppShell><Opener /></AppShell>)

    await act(async () => { fireEvent.click(screen.getByText('open')) })
    const similarButton = await screen.findByText(/Similar Movies/)
    await act(async () => { fireEvent.click(similarButton) })

    // Reaching this at all means useMultiSelect() found a provider. Before the
    // fix this render threw "useMultiSelect must be used within MultiSelectProvider".
    expect(await screen.findByRole('dialog', { name: /similar/i })).toBeInTheDocument()
  })

  // Spec §5.2: one blurred sheet per modal level. The Similar sheet sits beside
  // its title modal, not in the stack, so the title modal has to notice it on
  // its own; and a poster opened from Similar covers the Similar sheet in turn.
  it('leaves only the top sheet blurred as Similar and a title open over each other', async () => {
    const similar: TmdbSearchResult = { ...movie, tmdb_id: 680, title: 'Pulp Fiction', release_year: 1994 }
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('/api/tmdb/similar')) {
        return { ok: true, json: async () => [similar] } as Response
      }
      return {
        ok: true,
        json: async () => ({
          isWatched: false, isWatchlisted: false, isFollowed: false, watch_entry: null,
          director: null, cast_members: [], genres: [], runtime_mins: 170,
          trailer_url: null, watch_providers: null, vote_average: null, media_id: null,
        }),
      } as Response
    })
    render(<AppShell><Opener /></AppShell>)

    await act(async () => { fireEvent.click(screen.getByText('open')) })
    const heat = await screen.findByRole('dialog', { name: 'Heat' })
    expect(heat.className).not.toMatch(/backdrop-filter:none/)

    await act(async () => { fireEvent.click(await screen.findByText(/Similar Movies/)) })
    const similarSheet = await screen.findByRole('dialog', { name: /similar/i })
    expect(heat.className).toMatch(/backdrop-filter:none/)
    expect(similarSheet.className).not.toMatch(/backdrop-filter:none/)

    // Anchored: the select chip over the poster is "Select Pulp Fiction".
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /^Pulp Fiction/ })) })
    const top = await screen.findByRole('dialog', { name: 'Pulp Fiction' })
    expect(similarSheet.className).toMatch(/backdrop-filter:none/)
    expect(top.className).not.toMatch(/backdrop-filter:none/)
  })
})

describe('app layout provider order', () => {
  it('opens MultiSelectProvider outside MediaModalProvider', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../app/(app)/layout.tsx'), 'utf8',
    ).replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

    const multi = source.indexOf('<MultiSelectProvider>')
    const modal = source.indexOf('<MediaModalProvider>')
    expect(multi).toBeGreaterThan(-1)
    expect(modal).toBeGreaterThan(-1)
    // MediaModalProvider renders its stack as a sibling of its children, so
    // anything it owns sits at its own level in the tree. Every hook that stack
    // reaches for has to be provided from above it.
    expect(multi).toBeLessThan(modal)
  })

  it('keeps MotionProvider and framer-motion out of both root and authenticated layouts', () => {
    const appLayout = readFileSync(
      path.resolve(__dirname, '../../app/(app)/layout.tsx'), 'utf8',
    )
    const rootLayout = readFileSync(
      path.resolve(__dirname, '../../app/layout.tsx'), 'utf8',
    )

    expect(appLayout).not.toContain('MotionProvider')
    expect(appLayout).not.toContain('framer-motion')
    expect(rootLayout).not.toContain('MotionProvider')
    expect(rootLayout).not.toContain('framer-motion')
  })
})
