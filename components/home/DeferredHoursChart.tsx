'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'
import type { HoursChartProps } from './HoursChart'

// The chart's own height, so nothing shifts when the bars land.
const CHART_HEIGHT = 132

export function HoursChartSkeleton() {
  return (
    <div role="status" aria-busy="true" style={{ marginTop: 14 }}>
      <span className="sr-only">Loading chart...</span>
      <Skeleton className="h-[132px] w-full" />
    </div>
  )
}

// Same shape as DeferredStatsCharts: recharts is the heaviest dependency on
// the page, so it loads only once the panel is near the viewport, and never
// on the server.
const LazyHoursChart = dynamic(() => import('./HoursChart'), {
  ssr: false,
  loading: () => <HoursChartSkeleton />,
})

export default function DeferredHoursChart(props: HoursChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return

    const node = containerRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      let cancelled = false
      queueMicrotask(() => {
        if (!cancelled) {
          setIsVisible(true)
        }
      })
      return () => {
        cancelled = true
      }
    }

    let disconnected = false
    const disconnect = () => {
      if (!disconnected) {
        disconnected = true
        observer.disconnect()
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (disconnected) return
        if (entries.some((entry) => entry.isIntersecting)) {
          disconnect()
          setIsVisible(true)
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(node)

    return () => {
      disconnect()
    }
  }, [isVisible])

  return (
    <div ref={containerRef} style={{ minHeight: CHART_HEIGHT + 14 }}>
      {isVisible ? <LazyHoursChart {...props} /> : <HoursChartSkeleton />}
    </div>
  )
}
