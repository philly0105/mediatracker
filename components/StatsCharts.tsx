'use client'
import type { ReactNode } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend, type PieLabelRenderProps } from 'recharts'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// Tokens rather than the hex literals these used to be: `var()` resolves in SVG
// presentation attributes, so the charts retheme with the rest of the app
// instead of drifting from it.
const COLORS = [
  'var(--green-500)', 'var(--amber-400)', 'var(--rust-400)', 'var(--teal-400)',
  'var(--zinc-300)', 'var(--green-400)', 'var(--amber-300)', 'var(--rust-300)',
]

const AXIS_TICK = { fill: 'var(--zinc-400)', fontSize: 11 }

const tooltipStyle = {
  background: 'rgba(27,23,17,0.95)',
  border: '1px solid rgba(236,231,218,0.1)',
  borderRadius: '4px',
  color: 'var(--zinc-100)',
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
      <table className="sr-only">
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
    </>
  )
}

function summarise(pairs: Array<[string, number]>, unit: string) {
  if (pairs.length === 0) return `No ${unit} recorded yet.`
  return pairs.slice(0, 5).map(([label, value]) => `${label} ${value}`).join(', ')
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

export default function StatsCharts({ data }: { data: StatsData }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Activity <span className="text-sm font-medium text-zinc-500">· {data.activityLabel}</span>
          </h2>
          {/* Plain links rather than a client toggle: the year is a server-side
              query param, so this needs no JavaScript and stays bookmarkable. */}
          {data.years.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/stats"
                aria-current={data.selectedYear === null ? 'page' : undefined}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  data.selectedYear === null
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Last 12 months
              </Link>
              {data.years.map((year) => (
                <Link
                  key={year}
                  href={`/stats?year=${year}`}
                  aria-current={data.selectedYear === year ? 'page' : undefined}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                    data.selectedYear === year
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {year}
                </Link>
              ))}
            </div>
          )}
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
            <BarChart data={data.monthlyActivity}>
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--btn-ghost-bg)' }} />
              <Legend wrapperStyle={{ color: 'var(--zinc-400)', fontSize: 12 }} />
              <Bar dataKey="movies" fill="var(--green-500)" name="Movies" radius={[4, 4, 0, 0]} />
              <Bar dataKey="episodes" fill="var(--teal-400)" name="Episodes" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFigure>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Genres</h2>
          <ChartFigure
            summary={`Genre breakdown: ${summarise(
              data.genreBreakdown.map((g) => [g.genre, g.count]),
              'genres'
            )}`}
            columns={['Genre', 'Titles']}
            rows={data.genreBreakdown.slice(0, 8).map((g) => [g.genre, g.count])}
          >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 25, right: 35, bottom: 25, left: 35 }}>
              <Pie
                data={data.genreBreakdown.slice(0, 8)}
                dataKey="count"
                nameKey="genre"
                cx="50%"
                cy="50%"
                outerRadius={82}
                stroke="var(--bg-raised)"
                strokeWidth={1.5}
                label={({ x, y, name, index, textAnchor }: PieLabelRenderProps) => (
                  <text
                    x={x}
                    y={y}
                    fill={typeof index === 'number' ? COLORS[index % COLORS.length] : COLORS[0]}
                    textAnchor={textAnchor}
                    dominantBaseline="central"
                    fontSize={11.5}
                    fontWeight={600}
                  >
                    {name}
                  </text>
                )}
                // Was 25% cold white — the last of it in the charts.
                // --zinc-700 is the warm ramp's border value and the nearest
                // match to what that resolved to over a card.
                labelLine={{ stroke: 'var(--zinc-700)', strokeWidth: 1 }}
              >
                {data.genreBreakdown.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          </ChartFigure>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Ratings</h2>
          <ChartFigure
            summary={`Rating distribution: ${summarise(
              data.ratingDist.map((r) => [`${r.rating} stars`, r.count]),
              'ratings'
            )}`}
            columns={['Rating', 'Titles']}
            rows={data.ratingDist.map((r) => [`${r.rating} stars`, r.count])}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.ratingDist} margin={{ top: 15, right: 10, bottom: 10, left: -15 }}>
                <XAxis dataKey="rating" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--btn-ghost-bg)' }} />
                <Bar dataKey="count" fill="var(--amber-400)" name="Titles" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFigure>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold tracking-tight mb-4 text-white">Your Highest Rated</h2>
        <div className="space-y-2.5">
          {data.topRated.map((entry) => (
            <div key={`${entry.type}-${entry.title}`} className="flex items-center justify-between gap-4">
              <span className="text-zinc-200 text-sm truncate">{entry.title}</span>
              <span className="flex items-center gap-1 text-[var(--amber-400)] text-sm font-semibold tabular-nums shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" /> {entry.rating}
              </span>
            </div>
          ))}
          {data.topRated.length === 0 && (
            <p className="text-zinc-500 text-sm">Rate something and your best-of list appears here.</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Top Directors', items: data.topDirectors },
          { title: 'Top Actors', items: data.topActors },
        ].map(({ title, items }) => (
          <Card key={title}>
            <h2 className="text-lg font-semibold tracking-tight mb-4 text-white">{title}</h2>
            <div className="space-y-2.5">
              {items.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between">
                  <Link href={`/person/${encodeURIComponent(name)}`} className="text-zinc-200 text-sm hover:text-zinc-100 hover:underline transition-colors">
                    {name}
                  </Link>
                  <span className="text-zinc-500 text-sm tabular-nums">{count}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-zinc-500 text-sm">Not enough data yet.</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
