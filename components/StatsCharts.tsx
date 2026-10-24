'use client'
import React, { useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipContentProps,
  type XAxisTickContentProps,
} from 'recharts'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { revealInScroller } from '@/components/ui/SegmentedControl'

// Tokens rather than literals: `var()` resolves in SVG presentation
// attributes, so the charts retheme with the rest of the app.
const AXIS_TICK = { fill: 'var(--chart-axis)', fontSize: 12 }
const BASELINE = { stroke: 'var(--chart-baseline)' }
// The hover column behind a bar; the panel's own hover fill, not a tint.
const CURSOR = { fill: 'var(--glass-fill-hover)' }
const BAR_TOP: [number, number, number, number] = [4, 4, 0, 0]

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

/**
 * Recharts emits raw SVG with no accessible name and no text alternative, so
 * every panel on this page was silently empty for a screen reader. The chart
 * carries a one-line summary as an image, and the same numbers follow as a real
 * table that only assistive tech sees.
 */
function ChartFigure({
  summary,
  columns,
  rows,
  children,
}: {
  summary: string
  columns: string[]
  rows: Array<Array<string | number>>
  children: ReactNode
}) {
  return (
    <>
      <div role="img" aria-label={summary}>{children}</div>
      {/* sr-only clips a wrapping block, not the <table> itself: applied
          directly to a table the rule leaves its intrinsic width and
          white-space: nowrap intact, and the absolutely positioned table
          stretched the document past the viewport on /stats. */}
      <div className="sr-only">
        <table>
          <caption>{summary}</caption>
          <thead>
            <tr>{columns.map((col) => <th key={col} scope="col">{col}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, i) => (
                  i === 0
                    ? <th key={i} scope="row">{cell}</th>
                    : <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function summarise(pairs: Array<[string, number]>, unit: string) {
  if (pairs.length === 0) return `No ${unit} recorded yet.`
  return pairs.slice(0, 5).map(([label, value]) => `${label} ${value}`).join(', ')
}

// The tooltip is the elevated glass recipe without the blur: it floats over
// the chart inside a panel that already blurs, and a second filter there
// would both cost and double up.
function glassTooltip(heading: (props: TooltipContentProps) => ReactNode) {
  return function GlassTooltip(props: TooltipContentProps) {
    if (!props.active || props.payload.length === 0) return null
    return (
      <div
        className="glass-rim tabular"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          minWidth: 120,
          fontSize: 'var(--text-xs)',
          lineHeight: '16px',
          color: 'var(--text-secondary)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--text-primary)' }}>
          {heading(props)}
        </p>
        {props.payload.map((entry) => (
          <p key={String(entry.name)} style={{ margin: '2px 0 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{entry.name}</span>
            <span style={{ color: 'var(--text-primary)' }}>{String(entry.value)}</span>
          </p>
        ))}
      </div>
    )
  }
}

// `swatchClass` is the swatch's forced-colours fill: that mode repaints the
// inline token to Canvas, so it needs `!` to come back.
function LegendKey({ swatch, swatchClass, dashed, children }: { swatch?: string; swatchClass?: string; dashed?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={swatchClass}
        style={dashed
          ? { width: 14, height: 0, borderTop: '2px dashed var(--chart-line)' }
          : { width: 10, height: 10, borderRadius: 2, background: swatch }}
      />
      {children}
    </span>
  )
}

/** "2026-05" → "May". */
function shortMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

/** "2026-05" → "May 2026", for the tooltip, where a bare month is ambiguous
 *  across the rolling window's year boundary. */
function longMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Which bar wears the accent: the current month when it is in the window
 * (the rolling view and the current year), otherwise the peak, so a past year
 * still has one bar to read against the average. -1 when nothing is logged.
 */
export function highlightIndex(rows: Array<{ month: string; total: number }>, now: Date) {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentIdx = rows.findIndex((r) => r.month === current)
  if (currentIdx !== -1) return currentIdx
  let peak = -1
  rows.forEach((r, i) => {
    if (r.total > 0 && (peak === -1 || r.total > rows[peak].total)) peak = i
  })
  return peak
}

interface StatsData {
  totals: { movies: number; shows: number; episodes: number; hours: number }
  rewatches: number
  currentStreak: number
  longestStreak: number
  genreBreakdown: Array<{ genre: string; count: number }>
  ratingDist: Array<{ rating: number; count: number }>
  monthlyActivity: Array<{ month: string; movies: number; episodes: number }>
  activityLabel: string
  years: number[]
  selectedYear: number | null
  topRated: Array<{ title: string; type: 'movie' | 'show'; rating: number; watched_at: string }>
  topDirectors: Array<{ name: string; count: number }>
  topActors: Array<{ name: string; count: number }>
}

const LIST_TEXT: React.CSSProperties = { fontSize: 'var(--text-sm)', lineHeight: '18px' }

// 8px sides below sm so the rolling window and four years share one row in a
// 390 phone's 330px panel; a year pill is still 48 wide. Pills never shrink:
// a longer history scrolls inside the track instead of wrapping.
const YEAR_PILL = 'inline-flex h-9 shrink-0 items-center rounded-[var(--radius-thumb)] px-2 sm:px-3 text-xs tabular transition-colors duration-200'
const YEAR_PILL_ON = 'font-semibold text-[var(--text-primary)] bg-[var(--btn-ghost-bg)] shadow-[var(--glass-btn-edge)] forced-colors:forced-color-adjust-none forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
const YEAR_PILL_OFF = 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)]'

const ActivityTooltip = glassTooltip((props) => props.payload[0]?.payload?.long ?? props.label)
const RatingTooltip = glassTooltip((props) => `${props.label} stars`)

export default function StatsCharts({ data }: { data: StatsData }) {
  const reducedMotion = useReducedMotion()

  const activity = data.monthlyActivity.map((m) => ({
    ...m,
    total: m.movies + m.episodes,
    label: shortMonth(m.month),
    long: longMonth(m.month),
  }))
  const highlight = highlightIndex(activity, new Date())
  const average = activity.length > 0
    ? activity.reduce((sum, m) => sum + m.total, 0) / activity.length
    : 0

  const ratingPeak = data.ratingDist.reduce(
    (peak, r, i, all) => (r.count > 0 && (peak === -1 || r.count > all[peak].count) ? i : peak),
    -1,
  )

  const genres = data.genreBreakdown.slice(0, 8)
  const genreMax = genres[0]?.count ?? 0

  // Once the years outgrow the period track it scrolls, so the current period
  // is brought into it, as a pill focused from the keyboard is. Not a clicked
  // one: scrolling the track under a pressed pointer moves the pill away
  // before the click lands, and the period it opens is brought in here.
  const periodRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const current = periodRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    if (current) revealInScroller(current)
  }, [data.selectedYear])

  return (
    <div className="space-y-6">
      <Card as="section" variant="panel" aria-labelledby="stats-activity">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            id="stats-activity"
            title={<>Activity <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'], color: 'var(--text-muted)' }}>· {data.activityLabel}</span></>}
            style={{ marginBottom: 0 }}
          />
          {/* Plain links rather than a client toggle: the year is a server-side
              query param, so this needs no JavaScript and stays bookmarkable.
              The track is the segmented control's inset well, 36px segments
              inside a 44px track, and one row that scrolls sideways when the
              years outgrow it. */}
          {data.years.length > 0 && (
            <nav
              ref={periodRef}
              aria-label="Activity period"
              onFocus={(e) => { if (e.target.matches(':focus-visible')) revealInScroller(e.target) }}
              className="glass-inset scrollbar-none inline-flex max-w-full items-center gap-0.5 overflow-x-auto p-1"
            >
              <Link
                href="/stats"
                aria-current={data.selectedYear === null ? 'page' : undefined}
                className={`${YEAR_PILL} ${data.selectedYear === null ? YEAR_PILL_ON : YEAR_PILL_OFF}`}
              >
                Last 12 months
              </Link>
              {data.years.map((year) => (
                <Link
                  key={year}
                  href={`/stats?year=${year}`}
                  aria-current={data.selectedYear === year ? 'page' : undefined}
                  className={`${YEAR_PILL} ${data.selectedYear === year ? YEAR_PILL_ON : YEAR_PILL_OFF}`}
                >
                  {year}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div
          className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 tabular"
          style={{ fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)' }}
        >
          <LegendKey swatch="var(--chart-bar-strong)" swatchClass="forced-colors:bg-[color:GrayText]!">Movies</LegendKey>
          <LegendKey swatch="var(--chart-bar)" swatchClass="forced-colors:bg-[color:CanvasText]!">Episodes</LegendKey>
          {average > 0 && <LegendKey dashed>Avg {Math.round(average)}</LegendKey>}
        </div>
        <ChartFigure
          summary={`Activity, ${data.activityLabel}: ${summarise(
            data.monthlyActivity.map((m) => [m.month, m.movies + m.episodes]),
            'activity'
          )}`}
          columns={['Month', 'Movies', 'Episodes']}
          rows={data.monthlyActivity.map((m) => [m.month, m.movies, m.episodes])}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activity} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="label"
                axisLine={BASELINE}
                tickLine={false}
                // The current bar's month label takes the accent too, as in
                // the reference's "Oct". `payload.index` is the data index;
                // the top-level `index` only counts the ticks left after
                // Recharts thins them on a narrow chart.
                tick={({ x, y, payload }: Pick<XAxisTickContentProps, 'x' | 'y' | 'payload'>) => {
                  const on = payload.index === highlight
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={14}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={on ? 600 : 400}
                      fill={on ? 'var(--accent)' : 'var(--chart-axis)'}
                      className={on ? 'chart-tick-on' : undefined}
                    >
                      {String(payload.value)}
                    </text>
                  )
                }}
              />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={ActivityTooltip} cursor={CURSOR} />
              {average > 0 && (
                <ReferenceLine y={average} stroke="var(--chart-line)" strokeDasharray="4 4" ifOverflow="extendDomain" />
              )}
              {/* Stacked rather than grouped: one column per month reads
                  against the average line, and movies sit under episodes
                  because the brighter fill belongs at the base. The
                  highlighted column is the accent (spec §5.5), with the
                  lighter accent-hover at its base for the same reason. The
                  classes are the forced-colours hooks in globals.css. */}
              <Bar dataKey="movies" name="Movies" stackId="month" fill="var(--chart-bar-strong)" className="chart-bar-base" isAnimationActive={!reducedMotion}>
                {activity.map((_, i) => (
                  <Cell key={i} fill={i === highlight ? 'var(--accent-hover)' : 'var(--chart-bar-strong)'} className={i === highlight ? 'chart-bar-on' : undefined} />
                ))}
              </Bar>
              <Bar dataKey="episodes" name="Episodes" stackId="month" fill="var(--chart-bar)" radius={BAR_TOP} isAnimationActive={!reducedMotion}>
                {activity.map((_, i) => (
                  <Cell key={i} fill={i === highlight ? 'var(--accent)' : 'var(--chart-bar)'} className={i === highlight ? 'chart-bar-on' : undefined} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFigure>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card as="section" variant="panel" aria-labelledby="stats-genres">
          <SectionHeader id="stats-genres" title="Genres" />
          {/* A real list rather than a chart: each bar already has its label
              and count in the open, so it needs no image summary or hidden
              table. The top genre is the accent bar, as the current month is.
              Forced colours repaint the inline fills to Canvas, so there the
              bars take SegmentedProgress's system colours, `!` to beat them. */}
          {genres.length === 0 ? (
            <p style={{ ...LIST_TEXT, margin: 0, color: 'var(--text-muted)' }}>No genres recorded yet.</p>
          ) : (
            <ol className="m-0 list-none space-y-2.5 p-0">
              {genres.map((g, i) => (
                <li key={g.genre}>
                  <div className="flex items-baseline justify-between gap-3" style={LIST_TEXT}>
                    <span className="truncate" style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{g.genre}</span>
                    <span className="tabular shrink-0" style={{ color: 'var(--text-muted)' }}>{g.count}</span>
                  </div>
                  <div aria-hidden="true" className="mt-1 h-1.5 rounded-full forced-colors:bg-[color:GrayText]!" style={{ background: 'var(--progress-track)' }}>
                    <div
                      className={`h-full rounded-full ${i === 0 ? 'forced-colors:bg-[color:Highlight]!' : 'forced-colors:bg-[color:CanvasText]!'}`}
                      style={{
                        width: `${genreMax > 0 ? Math.round((g.count / genreMax) * 100) : 0}%`,
                        background: i === 0 ? 'var(--accent)' : 'var(--chart-bar)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card as="section" variant="panel" aria-labelledby="stats-ratings">
          <SectionHeader id="stats-ratings" title="Ratings" />
          <ChartFigure
            summary={`Rating distribution: ${summarise(
              data.ratingDist.map((r) => [`${r.rating} stars`, r.count]),
              'ratings'
            )}`}
            columns={['Rating', 'Titles']}
            rows={data.ratingDist.map((r) => [`${r.rating} stars`, r.count])}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.ratingDist} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="rating" tick={AXIS_TICK} axisLine={BASELINE} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={RatingTooltip} cursor={CURSOR} />
                <Bar dataKey="count" name="Titles" fill="var(--chart-bar)" radius={BAR_TOP} isAnimationActive={!reducedMotion}>
                  {data.ratingDist.map((_, i) => (
                    <Cell key={i} fill={i === ratingPeak ? 'var(--accent)' : 'var(--chart-bar)'} className={i === ratingPeak ? 'chart-bar-on' : undefined} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFigure>
        </Card>
      </div>

      <Card as="section" variant="panel" aria-labelledby="stats-top-rated">
        <SectionHeader id="stats-top-rated" title="Your highest rated" />
        <div className="space-y-2.5 min-h-[140px]">
          {data.topRated.map((entry) => (
            <div key={`${entry.type}-${entry.title}`} className="flex items-center justify-between gap-4" style={LIST_TEXT}>
              <span className="truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</span>
              <span className="tabular flex shrink-0 items-center gap-1 font-semibold" style={{ color: 'var(--rating)' }}>
                <Star size={14} strokeWidth={1.8} fill="currentColor" aria-hidden="true" /> {entry.rating}
              </span>
            </div>
          ))}
          {data.topRated.length === 0 && (
            <p style={{ ...LIST_TEXT, margin: 0, color: 'var(--text-muted)' }}>Rate something and your best-of list appears here.</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { id: 'stats-directors', title: 'Top Directors', items: data.topDirectors },
          { id: 'stats-actors', title: 'Top Actors', items: data.topActors },
        ].map(({ id, title, items }) => (
          <Card key={title} as="section" variant="panel" aria-labelledby={id}>
            <SectionHeader id={id} title={title} />
            <div className="space-y-2.5 min-h-[140px]">
              {items.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between gap-4" style={LIST_TEXT}>
                  <Link
                    href={`/person/${encodeURIComponent(name)}`}
                    className="truncate text-[var(--text-primary)] transition-colors hover:text-[var(--white)] hover:underline"
                  >
                    {name}
                  </Link>
                  <span className="tabular shrink-0" style={{ color: 'var(--text-muted)' }}>{count}</span>
                </div>
              ))}
              {items.length === 0 && <p style={{ ...LIST_TEXT, margin: 0, color: 'var(--text-muted)' }}>Not enough data yet.</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
