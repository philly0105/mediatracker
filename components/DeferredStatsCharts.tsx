'use client'

import React, { useEffect, useRef, useState, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import type StatsCharts from './StatsCharts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

// The chart list rows are 18px lines on a 10px rhythm, as in StatsCharts.
function ListSkeleton() {
  return (
    <div className="space-y-2.5 min-h-[140px]">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  )
}

// Mirrors StatsCharts panel for panel so nothing shifts when the real charts
// land: the same panel tier, a 26px heading line, and the same chart heights.
export function ChartsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-6"
    >
      <span className="sr-only">Loading charts...</span>
      <div aria-hidden="true" className="space-y-6">
        <Card variant="panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="ml-1 h-[26px] w-48" />
            <Skeleton className="h-11 w-56 rounded-[var(--radius-md)]" />
          </div>
          <Skeleton className="mb-3 ml-1 h-4 w-40" />
          <Skeleton className="h-[200px] w-full" />
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card variant="panel">
            <Skeleton className="mb-3 ml-1 h-[26px] w-24" />
            <Skeleton className="h-[280px] w-full" />
          </Card>

          <Card variant="panel">
            <Skeleton className="mb-3 ml-1 h-[26px] w-24" />
            <Skeleton className="h-[280px] w-full" />
          </Card>
        </div>

        <Card variant="panel">
          <Skeleton className="mb-3 ml-1 h-[26px] w-44" />
          <ListSkeleton />
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card variant="panel">
            <Skeleton className="mb-3 ml-1 h-[26px] w-32" />
            <ListSkeleton />
          </Card>
          <Card variant="panel">
            <Skeleton className="mb-3 ml-1 h-[26px] w-28" />
            <ListSkeleton />
          </Card>
        </div>
      </div>
    </div>
  )
}

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
