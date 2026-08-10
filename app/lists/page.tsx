'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListPlus } from 'lucide-react'

export default function ListsPage() {
  // null until the first load resolves — otherwise the empty state flashes
  // on every visit before the lists arrive.
  const [lists, setLists] = useState<List[] | null>(null)
  const [name, setName] = useState('')

  async function loadLists() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLists([]); return }
    const { data } = await supabase.from('lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
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
      <PageHeader
        eyebrow="Curated by you"
        title="Lists"
        sub="Group titles however you like — themes, moods, marathons."
      />

      <form onSubmit={createList} className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="New list name..." />
        <Button type="submit">Create</Button>
      </form>

      {lists !== null && lists.length === 0 && (
        <EmptyState
          icon={ListPlus}
          title="No lists yet"
          hint="Name one above to start collecting titles — a rewatch pile, a genre deep-dive, whatever you're planning."
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(lists ?? []).map(list => (
          <Link key={list.id} href={`/lists/${list.id}`} className="block">
            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
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
