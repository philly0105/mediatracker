'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d0f' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: 'rgba(109,40,217,0.18)' }} />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px]"
          style={{ background: 'rgba(234,88,12,0.14)' }} />
      </div>

      <form onSubmit={handleSubmit} className="relative w-full max-w-sm p-8 space-y-5 rounded-3xl backdrop-blur-md"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">DorfMovies</h1>
          <p className="text-sm text-zinc-400">Sign in to your account</p>
        </div>

        {error && (
          <p className="text-sm text-rose-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}>
            {error}
          </p>
        )}

        <div className="space-y-3">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full px-4 py-2.5 rounded-full text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full px-4 py-2.5 rounded-full text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        <button type="submit"
          className="w-full py-2.5 rounded-full font-medium text-sm transition-colors"
          style={{ background: '#ffffff', color: '#0d0d0f' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#e4e4e7')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
          Sign In
        </button>
      </form>
    </div>
  )
}
