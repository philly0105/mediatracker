import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LibraryView from '../LibraryView'
import { ToastProvider } from '../ToastProvider'
import { MultiSelectProvider } from '../MultiSelectProvider'
import type { WatchEntry } from '@/types'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
  layout?: unknown
}

function stripMotionProps({ ...props }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete props.initial
  delete props.animate
  delete props.exit
  delete props.transition
  delete props.layout
  return props
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: (props: MotionDivProps) => <div {...stripMotionProps(props)} />,
  },
}))

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn() }),
}))

function entry(id: string, title: string): WatchEntry {
  return {
    id,
    user_id: 'u1',
    media_id: `m-${id}`,
    rating: 4,
    review: null,
    watched_at: '2026-01-01',
    rewatch: false,
    created_at: '2026-01-01T00:00:00Z',
    media: {
      id: `m-${id}`,
      tmdb_id: Number(id),
      type: 'movie',
      title,
      overview: null,
      poster_url: null,
      genres: [],
      release_year: 2020,
      runtime_mins: 100,
      director: null,
      vote_average: 7.5,
      cast_members: [],
      collection_id: null,
      collection_name: null,
    },
  }
}

const mockFetch = vi.fn()

function renderLibrary() {
  return render(
    <ToastProvider>
      <MultiSelectProvider>
        <LibraryView type="movie" title="Movies" noun="movies" />
      </MultiSelectProvider>
    </ToastProvider>
  )
}

describe('LibraryView', () => {
  beforeEach(() => {
    refresh.mockClear()
    mockFetch.mockReset()
    global.fetch = mockFetch
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes a deleted row without refetching the list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat'), entry('2', 'Sicario')] }),
    })

    renderLibrary()
    await screen.findByText('Heat')
    expect(screen.getByText('Sicario')).toBeInTheDocument()
    expect(screen.getByText('2 watched')).toBeInTheDocument()

    // The DELETE response. If the component were still relying on
    // router.refresh(), the row would survive this and the test would fail.
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete entry')[0])
    })

    await waitFor(() => {
      expect(screen.queryByText('Heat')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Sicario')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()

    // One GET on mount, one DELETE. No refetch of the list.
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the row and stops the spinner when the delete fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await screen.findByText('Heat')

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete entry')[0])
    })

    // Row stays, an error is announced, and the button is interactive again —
    // a non-ok response used to leave isDeleting stuck on forever.
    expect(screen.getByText('Heat')).toBeInTheDocument()
    await screen.findByText('Could not delete that entry.')
    await waitFor(() => {
      expect(screen.getAllByTitle('Delete entry')[0]).not.toBeDisabled()
    })
  })
})
