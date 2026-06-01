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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{label}</span>
        <button onClick={toggle} className={`px-3 py-1 rounded-full text-sm font-medium ${token ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          {token ? 'Shared' : 'Private'}
        </button>
      </div>
      {url && (
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs border border-gray-700" />
          <button onClick={copyUrl} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
