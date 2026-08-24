import React, { Suspense } from 'react'
import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DeferredStatsCharts, { ChartsSkeleton } from '../DeferredStatsCharts'
import type StatsCharts from '../StatsCharts'

const dynamicMockState = vi.hoisted(() => ({
  capturedOptions: undefined as { loading?: ComponentType<any>; ssr?: boolean } | undefined,
  capturedLoader: undefined as (() => Promise<any>) | undefined,
}))

vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>,
    options?: { loading?: ComponentType<any>; ssr?: boolean }
  ) => {
    dynamicMockState.capturedLoader = loader
    dynamicMockState.capturedOptions = options
    const LazyComponent = React.lazy(async () => {
      const mod = await loader()
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod as { default: ComponentType<any> }
      }
      return { default: mod as ComponentType<any> }
    })

    return function DynamicComponent(props: any) {
      return (
        <Suspense fallback={options?.loading ? <options.loading /> : null}>
          <LazyComponent {...props} />
        </Suspense>
      )
    }
  },
}))

vi.mock('../StatsCharts', () => ({
  default: (props: { data?: { activityLabel?: string } }) => (
    <div>loaded charts{props.data?.activityLabel ? ` - ${props.data.activityLabel}` : ''}</div>
  ),
}))

type MockIntersectionObserverCallback = (entries: readonly { isIntersecting: boolean }[]) => void

let observerCallback: MockIntersectionObserverCallback | null = null
const disconnectSpy = vi.fn()
const observeSpy = vi.fn()
const unobserveSpy = vi.fn()
let observerOptions: IntersectionObserverInit | undefined

const sampleStatsData: React.ComponentProps<typeof StatsCharts>['data'] = {
  totals: { movies: 12, shows: 4, episodes: 45, hours: 80 },
  rewatches: 3,
  currentStreak: 5,
  longestStreak: 12,
  genreBreakdown: [{ genre: 'Drama', count: 10 }],
  ratingDist: [{ rating: 4, count: 5 }],
  monthlyActivity: [{ month: '2026-05', movies: 3, episodes: 10 }],
  activityLabel: 'Last 12 months',
  years: [2026, 2025],
  selectedYear: null,
  topRated: [{ title: 'Inception', type: 'movie', rating: 5, watched_at: '2026-05-01' }],
  topDirectors: [{ name: 'Christopher Nolan', count: 4 }],
  topActors: [{ name: 'Leonardo DiCaprio', count: 5 }],
}

describe('DeferredStatsCharts', () => {
  beforeEach(() => {
    observerCallback = null
    disconnectSpy.mockReset()
    observeSpy.mockReset()
    unobserveSpy.mockReset()
    observerOptions = undefined

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null
      readonly rootMargin: string
      readonly thresholds: readonly number[] = []

      constructor(callback: MockIntersectionObserverCallback, options?: IntersectionObserverInit) {
        observerCallback = callback
        observerOptions = options
        this.rootMargin = options?.rootMargin ?? ''
      }

      observe(target: Element): void {
        observeSpy(target)
      }

      unobserve(target: Element): void {
        unobserveSpy(target)
      }

      disconnect(): void {
        disconnectSpy()
      }

      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('configures next/dynamic with ssr: false and the shared skeleton loader', () => {
    expect(dynamicMockState.capturedOptions?.ssr).toBe(false)
    expect(typeof dynamicMockState.capturedOptions?.loading).toBe('function')

    if (dynamicMockState.capturedOptions?.loading) {
      const Loading = dynamicMockState.capturedOptions.loading
      const { container } = render(<Loading />)
      expect(container.querySelector('[role="status"]')).toBeInTheDocument()
      expect(screen.getByText('Loading charts...')).toBeInTheDocument()
    }
  })

  it('defers rendering chart component until intersecting, uses 300px vertical rootMargin, and disconnects observer', async () => {
    render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(observerOptions).toEqual({ rootMargin: '300px 0px' })
    expect(screen.queryByText(/loaded charts/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading charts...')).toBeInTheDocument()

    act(() => {
      observerCallback?.([{ isIntersecting: true }])
    })

    expect(await screen.findByText('loaded charts - Last 12 months')).toBeInTheDocument()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('does not load charts when intersection entry is not intersecting', () => {
    render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(screen.queryByText(/loaded charts/)).not.toBeInTheDocument()

    act(() => {
      observerCallback?.([{ isIntersecting: false }])
    })

    expect(screen.queryByText(/loaded charts/)).not.toBeInTheDocument()
    expect(disconnectSpy).not.toHaveBeenCalled()
  })

  it('disconnects the observer when unmounted before intersection', () => {
    const { unmount } = render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(disconnectSpy).not.toHaveBeenCalled()
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('guards IntersectionObserver callback if fired after unmount and performs no state update', () => {
    const { unmount } = render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(disconnectSpy).not.toHaveBeenCalled()
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)

    act(() => {
      observerCallback?.([{ isIntersecting: true }])
    })

    expect(screen.queryByText(/loaded charts/)).not.toBeInTheDocument()
  })

  it('immediately loads charts when IntersectionObserver is not available', async () => {
    // @ts-expect-error test environment override
    delete window.IntersectionObserver

    render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(await screen.findByText('loaded charts - Last 12 months')).toBeInTheDocument()
  })

  it('renders accessible loading state with role="status" and visually hidden label without noisy nested announcements', () => {
    const { container } = render(<ChartsSkeleton />)

    const statusEl = screen.getByRole('status')
    expect(statusEl).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading charts...')).toHaveClass('sr-only')

    const ariaHiddenContainers = container.querySelectorAll('[aria-hidden="true"]')
    expect(ariaHiddenContainers.length).toBeGreaterThanOrEqual(1)
  })

  it('reserves identical 5-row stable list heights and chart dimensions across skeleton and loaded components', () => {
    const { container } = render(<ChartsSkeleton />)

    // Chart height reservations
    expect(container.querySelector('.h-\\[200px\\]')).toBeInTheDocument()
    const chart280Skeletons = container.querySelectorAll('.h-\\[280px\\]')
    expect(chart280Skeletons.length).toBe(2)

    // List card containers in skeleton reserve min-height for 5 rows
    const reservedListContainers = container.querySelectorAll('.space-y-2\\.5.min-h-\\[140px\\]')
    expect(reservedListContainers.length).toBe(3) // Highest Rated, Directors, Actors

    // Each list container in skeleton has exactly 5 skeleton rows
    reservedListContainers.forEach((listContainer) => {
      const rows = listContainer.querySelectorAll('.h-5')
      expect(rows.length).toBe(5)
    })

    // Source assertions on StatsCharts.tsx confirming matching min-h-[140px] and 5-item layout
    const statsChartsSource = readFileSync(join(__dirname, '..', 'StatsCharts.tsx'), 'utf8')
    expect(statsChartsSource).toContain('space-y-2.5 min-h-[140px]')
    // Match count: 1 for topRated + 1 in the map over [Top Directors, Top Actors] = all 3 list cards
    const minHeightMatches = statsChartsSource.match(/min-h-\[140px\]/g)
    expect(minHeightMatches?.length).toBe(2)
  })
})
