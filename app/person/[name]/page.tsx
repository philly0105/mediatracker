'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { ArrowLeft, User, AlertCircle } from 'lucide-react'

export default function PersonPage() {
  const params = useParams()
  const router = useRouter()
  const rawName = params?.name as string
  const name = rawName ? decodeURIComponent(rawName) : ''

  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!name) return
    async function fetchPersonData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/person?name=${encodeURIComponent(name)}`)
        if (!res.ok) throw new Error('Failed to load person details')
        const data = await res.json()
        setEntries(data.entries || [])
        setProfileUrl(data.profile_url || null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPersonData()
  }, [name])

  if (!name) return null

  return (
    <div className="space-y-8 pb-12">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-2 border-white/10"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-900 border-2 border-white/5 flex items-center justify-center text-zinc-600 shadow-inner">
            <User className="w-10 h-10 md:w-12 md:h-12" />
          </div>
        )}
        <div className="flex-1 text-center md:text-left pt-2">
          <h1 className="text-3xl font-black text-white tracking-tight">{name}</h1>
          <p className="text-zinc-400 mt-1">
            You've watched {entries.length} title{entries.length !== 1 ? 's' : ''} featuring {name}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map((entry) => (
            <MediaCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
