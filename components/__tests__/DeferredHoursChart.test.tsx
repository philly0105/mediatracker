import React, { Suspense } from 'react'
import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DeferredHoursChart, { HoursChartSkeleton } from '../home/DeferredHoursChart'

const dynamicMockState = vi.hoisted(() => ({
  capturedOptions: undefined as { loading?: ComponentType<unknown>; ssr?: boolean } | undefined,
}))

vi.mock('next/dynamic', () => ({
  default: <P extends object>(
    loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
    options?: { loading?: ComponentType<unknown>; ssr?: boolean }
  ) => {
    dynamicMockState.capturedOptions = options
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

vi.mock('../home/HoursChart', () => ({
  default: (props: { average: number }) => <div>loaded hours chart - avg {props.average}</div>,
}))

type ObserverCallback = (entries: readonly { isIntersecting: boolean }[]) => void

let observerCallback: ObserverCallback | null = null
const disconnectSpy = vi.fn()
const observeSpy = vi.fn()
let observerOptions: IntersectionObserverInit | undefined

const months = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, hours: i * 2 }))

describe('DeferredHoursChart', () => {
  beforeEach(() => {
    observerCallback = null
    disconnectSpy.mockReset()
    observeSpy.mockReset()
    observerOptions = undefined

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null
      readonly rootMargin: string
      readonly thresholds: readonly number[] = []

      constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
        observerCallback = callback
        observerOptions = options
        this.rootMargin = options?.rootMargin ?? ''
      }

      observe(target: Element): void { observeSpy(target) }
      unobserve(): void {}
      disconnect(): void { disconnectSpy() }
      takeRecords(): IntersectionObserverEntry[] { return [] }
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('configures next/dynamic with ssr: false and the chart skeleton', () => {
    expect(dynamicMockState.capturedOptions?.ssr).toBe(false)
    expect(typeof dynamicMockState.capturedOptions?.loading).toBe('function')

    const Loading = dynamicMockState.capturedOptions!.loading!
    render(<Loading />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading chart...')).toHaveClass('sr-only')
  })

  it('keeps recharts out of the server render: only the deferred wrapper imports it', () => {
    const root = join(__dirname, '..')
    const homeFiles = ['HomeStatsPanel.tsx', 'DeferredHoursChart.tsx']
    for (const file of homeFiles) {
      expect(readFileSync(join(root, 'home', file), 'utf8')).not.toMatch(/from 'recharts'/)
    }
    expect(readFileSync(join(root, 'home', 'HoursChart.tsx'), 'utf8')).toMatch(/from 'recharts'/)
    expect(readFileSync(join(root, 'home', 'DeferredHoursChart.tsx'), 'utf8')).toMatch(/import\(\s*'\.\/HoursChart'\s*\)/)
  })

  it('defers the chart until the panel is near the viewport, then disconnects', async () => {
    render(<DeferredHoursChart months={months} currentIndex={9} average={9} />)

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(observerOptions).toEqual({ rootMargin: '300px 0px' })
    expect(screen.queryByText(/loaded hours chart/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => {
      observerCallback?.([{ isIntersecting: true }])
    })

    expect(await screen.findByText('loaded hours chart - avg 9')).toBeInTheDocument()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('disconnects the observer when unmounted before intersection', () => {
    const { unmount } = render(<DeferredHoursChart months={months} currentIndex={9} average={9} />)

    expect(disconnectSpy).not.toHaveBeenCalled()
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('loads at once when IntersectionObserver is not available', async () => {
    // @ts-expect-error test environment override
    delete window.IntersectionObserver

    render(<DeferredHoursChart months={months} currentIndex={9} average={9} />)

    expect(await screen.findByText('loaded hours chart - avg 9')).toBeInTheDocument()
  })

  it('reserves the chart height in the skeleton', () => {
    const { container } = render(<HoursChartSkeleton />)
    expect(container.querySelector('.h-\\[132px\\]')).toBeInTheDocument()
  })
})
