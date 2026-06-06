'use client'
import { useState } from 'react'

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
          onClick={toggle} 
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            token 
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30' 
              : 'bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10 hover:text-zinc-300'
          }`}
        >
          {token ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      {url && (
        <div className="flex gap-2">
          <input 
            readOnly 
            value={url} 
            className="flex-1 px-3 py-2 bg-black/40 text-zinc-300 rounded-xl text-xs font-medium border border-white/5 focus:outline-none focus:border-violet-500/50 transition-colors" 
          />
          <button 
            onClick={copyUrl} 
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-white rounded-xl transition-colors shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
