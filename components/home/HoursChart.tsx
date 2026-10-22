'use client'
import React, { useSyncExternalStore } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type XAxisTickContentProps,
} from 'recharts'

export type HoursChartProps = {
  /** January first, as computeYearlyHours returns them, cut to the months so far. */
  months: Array<{ month: string; hours: number }>
  /** Which bar wears the accent: the current month, normally the last. */
  currentIndex: number
  /** Hours per elapsed month, drawn as the dashed line. */
  average: number
}

const CHART_HEIGHT = 132

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

// Optional-called because jsdom, which the test suite runs in, has no matchMedia.
function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

// Recharts animates bars with inline transforms that the global reduced-motion
// rule in globals.css cannot reach, so the preference is read here and the
// bars simply appear.
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => false,
  )
}

/** "2026-05" → "May". */
function monthName(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

// The elevated glass recipe without the blur: it floats inside a panel that
// already blurs, and a second filter there would both cost and double up.
function HoursTooltip(props: TooltipContentProps) {
  if (!props.active || props.payload.length === 0) return null
  const row = props.payload[0].payload as { name: string; hours: number }
  return (
    <div
      className="glass-rim tabular"
      style={{
        background: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        fontSize: 'var(--text-xs)',
        lineHeight: '16px',
        color: 'var(--text-secondary)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--text-primary)' }}>
        {row.name}
      </p>
      <p style={{ margin: '2px 0 0' }}>{row.hours}h watched</p>
    </div>
  )
}

/**
 * The "Hours per month" bars of the reference's "2026 so far" panel: one
 * narrow rounded bar per month so far on a baseline, the current month in the
 * accent and the average as a dashed line. Loaded through DeferredHoursChart so recharts
 * stays out of Home's initial bundle.
 */
export default function HoursChart({ months, currentIndex, average }: HoursChartProps) {
  const reducedMotion = useReducedMotion()
  const data = months.map((row, i) => ({
    label: LETTERS[i] ?? '',
    name: monthName(row.month),
    hours: Math.round(row.hours),
  }))
  const summary = `Hours watched per month: ${data.map((row) => `${row.name} ${row.hours}`).join(', ')}.`

  return (
    <>
      <div role="img" aria-label={summary} style={{ marginTop: 14 }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: 2 }} barCategoryGap="30%">
            <XAxis
              dataKey="label"
              interval={0}
              axisLine={{ stroke: 'var(--chart-baseline)' }}
              tickLine={false}
              tick={({ x, y, payload, index }: Pick<XAxisTickContentProps, 'x' | 'y' | 'payload' | 'index'>) => (
                <text
                  x={x}
                  y={y}
                  dy={14}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={index === currentIndex ? 600 : 400}
                  fill={index === currentIndex ? 'var(--accent)' : 'var(--chart-axis)'}
                >
                  {String(payload.value)}
                </text>
              )}
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip content={HoursTooltip} cursor={{ fill: 'var(--glass-fill-hover)' }} />
            {average > 0 && (
              <ReferenceLine y={average} stroke="var(--chart-line)" strokeWidth={1.2} strokeDasharray="3 3" ifOverflow="extendDomain" />
            )}
            <Bar dataKey="hours" name="Hours" fill="var(--chart-bar)" radius={4} maxBarSize={16} isAnimationActive={!reducedMotion}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === currentIndex ? 'var(--accent)' : 'var(--chart-bar)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The same numbers as a table only assistive tech sees; recharts' SVG
          has no text alternative of its own. */}
      <div className="sr-only">
        <table>
          <caption>{summary}</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col">Hours</th></tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name}><th scope="row">{row.name}</th><td>{row.hours}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
