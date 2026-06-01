import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'MediaTracker' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unavailable — render without auth nav
  }

  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#0d0d0f', color: '#f4f4f5', minHeight: '100vh' }}>
        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px]"
            style={{ background: 'rgba(109,40,217,0.18)' }} />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px]"
            style={{ background: 'rgba(234,88,12,0.14)' }} />
          <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(225,29,72,0.07)' }} />
        </div>

        {user && (
          <nav className="sticky top-0 z-40 border-b flex items-center gap-6 px-6 py-4 backdrop-blur-md"
            style={{ background: 'rgba(13,13,15,0.8)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Link href="/" className="font-bold text-white tracking-tight">MediaTracker</Link>
            <Link href="/search" className="text-zinc-400 hover:text-white text-sm transition-colors">Search</Link>
            <Link href="/movies" className="text-zinc-400 hover:text-white text-sm transition-colors">Movies</Link>
            <Link href="/shows" className="text-zinc-400 hover:text-white text-sm transition-colors">Shows</Link>
            <Link href="/watchlist" className="text-zinc-400 hover:text-white text-sm transition-colors">Watchlist</Link>
            <Link href="/lists" className="text-zinc-400 hover:text-white text-sm transition-colors">Lists</Link>
            <Link href="/stats" className="text-zinc-400 hover:text-white text-sm transition-colors">Stats</Link>
            <Link href="/import" className="text-zinc-400 hover:text-white text-sm transition-colors">Import</Link>
            <div className="ml-auto">
              <Link href="/settings" className="text-zinc-400 hover:text-white text-sm transition-colors">Settings</Link>
            </div>
          </nav>
        )}
        <main className="relative px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  )
}
