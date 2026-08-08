import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MediaInfoModal from '../MediaInfoModal'
import { ToastProvider } from '../ToastProvider'
import { MediaActionError } from '@/lib/useMediaActions'
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

const item: TmdbSearchResult = {
  tmdb_id: 550,
  type: 'movie',
  title: 'Heat',
  overview: 'A movie',
  poster_url: null,
  release_year: 1995,
}

const mockFetch = vi.fn()

// The modal loads /api/tmdb/details on mount; isWatched drives which primary
// button renders.
function mockDetails(isWatched: boolean) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      ...item,
      isWatched,
      isWatchlisted: false,
      isFollowed: false,
      director: null,
      cast_members: [],
      genres: [],
      runtime_mins: 170,
      trailer_url: null,
      watch_providers: null,
      vote_average: 8.3,
    }),
  })
}

function renderModal(onMarkAsWatched: (opts?: { rewatch?: boolean }) => Promise<void>) {
  return render(
    <ToastProvider>
      <MediaInfoModal
        item={item}
        onClose={vi.fn()}
        onAddToWatchlist={vi.fn().mockResolvedValue(undefined)}
        onMarkAsWatched={onMarkAsWatched}
      />
    </ToastProvider>
  )
}

describe('MediaInfoModal rewatch flow', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers a rewatch instead of an error when the entry already exists', async () => {
    mockDetails(false)
    const onMarkAsWatched = vi
      .fn()
      .mockRejectedValueOnce(new MediaActionError('Already in your watch history', 409))
      .mockResolvedValueOnce(undefined)

    renderModal(onMarkAsWatched)

    const button = await screen.findByText('Mark as Watched')
    await act(async () => {
      fireEvent.click(button)
    })

    // The 409 is an offer, not a failure: no error toast, and crucially no
    // success toast either — a wrapping handler that swallowed the rejection
    // would make the modal report success on a write that never happened.
    await screen.findByText('Heat is already in your history.')
    expect(screen.queryByText('Logged Heat as watched.')).not.toBeInTheDocument()

    // Taking the offer retries with rewatch enabled.
    await act(async () => {
      fireEvent.click(screen.getByText('Log rewatch'))
    })

    expect(onMarkAsWatched).toHaveBeenCalledTimes(2)
    expect(onMarkAsWatched).toHaveBeenNthCalledWith(1, undefined)
    expect(onMarkAsWatched).toHaveBeenNthCalledWith(2, { rewatch: true })
    await screen.findByText('Logged a rewatch of Heat.')
  })

  it('surfaces a non-409 failure as an error and does not claim success', async () => {
    mockDetails(false)
    const onMarkAsWatched = vi
      .fn()
      .mockRejectedValue(new MediaActionError('Database exploded', 500))

    renderModal(onMarkAsWatched)

    const button = await screen.findByText('Mark as Watched')
    await act(async () => {
      fireEvent.click(button)
    })

    await screen.findByText('Database exploded')
    expect(screen.queryByText('Logged Heat as watched.')).not.toBeInTheDocument()
    expect(screen.queryByText('Log rewatch')).not.toBeInTheDocument()
  })

  it('renders an enabled Log rewatch action for something already watched', async () => {
    mockDetails(true)
    const onMarkAsWatched = vi.fn().mockResolvedValue(undefined)

    renderModal(onMarkAsWatched)

    // Was a permanently disabled "Already Watched" chip before F1.
    const button = await screen.findByText('Log rewatch')
    expect(screen.queryByText('Already Watched')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(onMarkAsWatched).toHaveBeenCalledWith({ rewatch: true })
    })
  })
})
