'use client'

import React, { useEffect, useRef, useState, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import type StatsCharts from './StatsCharts'
import { ChartsSkeleton } from './StatsChartsSkeleton'

const LazyStatsCharts = dynamic(() => import('./StatsCharts'), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
})

export type DeferredStatsChartsProps = ComponentProps<typeof StatsCharts>

export default function DeferredStatsCharts(props: DeferredStatsChartsProps) {
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
        const isIntersecting = entries.some((entry) => entry.isIntersecting)
        if (isIntersecting) {
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
    <div ref={containerRef}>
      {isVisible ? <LazyStatsCharts {...props} /> : <ChartsSkeleton />}
    </div>
  )
}
