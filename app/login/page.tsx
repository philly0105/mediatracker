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
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-white">MediaTracker</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" required
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" required
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
