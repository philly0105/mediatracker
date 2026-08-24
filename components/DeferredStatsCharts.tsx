'use client'

import React, { useEffect, useRef, useState, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import type StatsCharts from './StatsCharts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function ChartsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading charts">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-[200px] w-full" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Skeleton className="h-6 w-24 mb-5" />
          <Skeleton className="h-[280px] w-full" />
        </Card>

        <Card>
          <Skeleton className="h-6 w-24 mb-5" />
          <Skeleton className="h-[280px] w-full" />
        </Card>
      </div>

      <Card>
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="space-y-2.5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </Card>
        <Card>
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </Card>
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
      setIsVisible(true)
      return
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
        const isIntersecting = entries.some((entry) => entry.isIntersecting)
        if (isIntersecting) {
          setIsVisible(true)
          disconnect()
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
