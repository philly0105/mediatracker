'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']

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
    <div className="space-y-8">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Activity</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthlyActivity}>
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
            <Legend />
            <Bar dataKey="movies" fill="#3b82f6" name="Movies" />
            <Bar dataKey="episodes" fill="#8b5cf6" name="Episodes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Genres</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.genreBreakdown.slice(0, 8)} dataKey="count" nameKey="genre" cx="50%" cy="50%" outerRadius={80} label={({ genre }: any) => genre}>
                {data.genreBreakdown.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Ratings</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ratingDist}>
              <XAxis dataKey="rating" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', color: '#fff' }} />
              <Bar dataKey="count" fill="#f59e0b" name="Films" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Top Directors', items: data.topDirectors },
          { title: 'Top Actors', items: data.topActors },
        ].map(({ title, items }) => (
          <div key={title} className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">{title}</h2>
            <div className="space-y-2">
              {items.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{name}</span>
                  <span className="text-gray-500 text-sm">{count}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-600 text-sm">Not enough data yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
