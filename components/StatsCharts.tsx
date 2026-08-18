'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend, type PieLabelRenderProps } from 'recharts'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const COLORS = ['#7c9a6a', '#d3a85c', '#c4805f', '#6f9089', '#c8bda7', '#97b27e', '#e6c489', '#d8a18a']

const tooltipStyle = {
  background: 'rgba(27,23,17,0.95)',
  border: '1px solid rgba(236,231,218,0.1)',
  borderRadius: '4px',
  color: '#e9e2d3',
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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthlyActivity}>
            <XAxis dataKey="month" tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend wrapperStyle={{ color: '#9d9079', fontSize: 12 }} />
            <Bar dataKey="movies" fill="#7c9a6a" name="Movies" radius={[4, 4, 0, 0]} />
            <Bar dataKey="episodes" fill="#6f9089" name="Episodes" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Genres</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 25, right: 35, bottom: 25, left: 35 }}>
              <Pie
                data={data.genreBreakdown.slice(0, 8)}
                dataKey="count"
                nameKey="genre"
                cx="50%"
                cy="50%"
                outerRadius={82}
                stroke="#1b1711"
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
                labelLine={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }}
              >
                {data.genreBreakdown.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Ratings</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.ratingDist} margin={{ top: 15, right: 10, bottom: 10, left: -15 }}>
              <XAxis dataKey="rating" tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#d3a85c" name="Titles" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold tracking-tight mb-4 text-white">Your Highest Rated</h2>
        <div className="space-y-2.5">
          {data.topRated.map((entry) => (
            <div key={`${entry.type}-${entry.title}`} className="flex items-center justify-between gap-4">
              <span className="text-zinc-200 text-sm truncate">{entry.title}</span>
              <span className="text-[var(--amber-400)] text-sm font-semibold tabular-nums shrink-0">
                ★ {entry.rating}
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
