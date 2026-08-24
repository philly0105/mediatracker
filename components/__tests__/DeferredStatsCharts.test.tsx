import React, { Suspense } from 'react'
import type { ComponentType } from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DeferredStatsCharts from '../DeferredStatsCharts'
import type StatsCharts from '../StatsCharts'

vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>,
    options?: { loading?: ComponentType<any>; ssr?: boolean }
  ) => {
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

  it('defers rendering chart component until intersecting, uses 300px vertical rootMargin, and disconnects observer', async () => {
    render(<DeferredStatsCharts data={sampleStatsData} />)

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(observerOptions).toEqual({ rootMargin: '300px 0px' })
    expect(screen.queryByText(/loaded charts/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Loading charts')).toBeInTheDocument()

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
})
