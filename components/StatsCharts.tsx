'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#f97316', '#e4e4e7', '#fb7185', '#a3a3a3', '#fbbf24', '#d4d4d8', '#f87171', '#71717a']

const tooltipStyle = {
  background: 'rgba(13,13,15,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#f4f4f5',
}

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
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
      <div className="rounded-2xl p-6 backdrop-blur-md" style={glassCard}>
        <h2 className="text-lg font-semibold tracking-tight mb-5">Monthly Activity</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthlyActivity}>
            <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend wrapperStyle={{ color: '#a3a3a3', fontSize: 12 }} />
            <Bar dataKey="movies" fill="#f97316" name="Movies" radius={[4, 4, 0, 0]} />
            <Bar dataKey="episodes" fill="#a3a3a3" name="Episodes" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 backdrop-blur-md" style={glassCard}>
          <h2 className="text-lg font-semibold tracking-tight mb-5">Genres</h2>
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
        </div>

        <div className="rounded-2xl p-6 backdrop-blur-md" style={glassCard}>
          <h2 className="text-lg font-semibold tracking-tight mb-5">Ratings</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ratingDist}>
              <XAxis dataKey="rating" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#fbbf24" name="Films" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Top Directors', items: data.topDirectors },
          { title: 'Top Actors', items: data.topActors },
        ].map(({ title, items }) => (
          <div key={title} className="rounded-2xl p-6 backdrop-blur-md" style={glassCard}>
            <h2 className="text-lg font-semibold tracking-tight mb-4">{title}</h2>
            <div className="space-y-2.5">
              {items.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-zinc-300 text-sm">{name}</span>
                  <span className="text-zinc-600 text-sm tabular-nums">{count}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-zinc-600 text-sm">Not enough data yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
