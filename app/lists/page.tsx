'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [name, setName] = useState('')

  async function loadLists() {
    const supabase = createClient()
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
    <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>Lists</h1>
      
      <form onSubmit={createList} className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="New list name..." />
        <Button type="submit">Create</Button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lists.map(list => (
          <Link key={list.id} href={`/lists/${list.id}`} className="block">
            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <span className="text-white font-medium">{list.name}</span>
              {list.is_shared && (
                <Badge tone="brand">Shared</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
