'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'

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
      <h1 className="text-2xl font-bold">Lists</h1>
      <form onSubmit={createList} className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New list name..."
          className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500" />
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create</button>
      </form>
      <div className="space-y-2">
        {lists.map(list => (
          <Link key={list.id} href={`/lists/${list.id}`}
            className="flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 rounded-xl">
            <span className="text-white">{list.name}</span>
            {list.is_shared && <span className="text-xs text-blue-400">Shared</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
