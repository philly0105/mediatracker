'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  label: string
  type: 'watched' | 'watchlist'
  token: string | null
  shareUrl: string | null
}

export default function ShareToggle({ label, type, token: initialToken, shareUrl: initialUrl }: Props) {
  const [token, setToken] = useState(initialToken)
  const [url, setUrl] = useState(initialUrl)
  const [copied, setCopied] = useState(false)

  async function toggle() {
    const enabled = !token
    const res = await fetch('/api/settings/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, enabled }),
    })
    const data = await res.json()
    setToken(data.token)
    setUrl(data.token ? `${window.location.origin}/share/${type}/${data.token}` : null)
  }

  async function copyUrl() {
    if (!url) return
    await navigator.clipboard.writeText(url)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(token)}
          aria-label={`Toggle public sharing for ${label}`}
          onClick={toggle}
          className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            token
              ? 'bg-[var(--green-tint-bg)] text-[var(--accent)] border border-[var(--green-tint-border)] hover:bg-[var(--green-tint-bg)]/80'
              : 'bg-[var(--btn-ghost-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:bg-white/5 hover:text-zinc-300'
          }`}
        >
          {token ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      {url && (
        <div className="flex gap-2">
          <Input
            readOnly
            value={url}
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyUrl}
            className="shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  )
}
