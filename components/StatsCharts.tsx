'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
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
  genreBreakdown: Array<{ genre: string; count: number }>
  ratingDist: Array<{ rating: number; count: number }>
  monthlyActivity: Array<{ month: string; movies: number; episodes: number }>
  topDirectors: Array<{ name: string; count: number }>
  topActors: Array<{ name: string; count: number }>
}

export default function StatsCharts({ data }: { data: StatsData }) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Monthly Activity</h2>
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.genreBreakdown.slice(0, 8)} dataKey="count" nameKey="genre"
                cx="50%" cy="50%" outerRadius={80} label={({ genre }: any) => genre}
                labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                {data.genreBreakdown.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Ratings</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ratingDist}>
              <XAxis dataKey="rating" tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9d9079', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#d3a85c" name="Films" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

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
