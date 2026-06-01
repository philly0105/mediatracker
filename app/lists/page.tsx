'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [name, setName] = useState('')
  const supabase = createClient()

  async function loadLists() {
    const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false })
    setLists(data ?? [])
  }

  useEffect(() => { loadLists() }, [])

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    loadLists()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Lists</h1>
      <form onSubmit={createList} className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New list name..."
          className="flex-1 px-4 py-2.5 rounded-full text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button type="submit"
          className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          style={{ background: '#ffffff', color: '#0d0d0f' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#e4e4e7')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
          Create
        </button>
      </form>
      <div className="space-y-2">
        {lists.map(list => (
          <Link key={list.id} href={`/lists/${list.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-2xl backdrop-blur-md transition-colors"
            style={glassCard}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}>
            <span className="text-white">{list.name}</span>
            {list.is_shared && (
              <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Shared
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
