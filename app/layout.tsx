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
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {user && (
          <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-white">MediaTracker</Link>
            <Link href="/search" className="text-gray-400 hover:text-white text-sm">Search</Link>
            <Link href="/movies" className="text-gray-400 hover:text-white text-sm">Movies</Link>
            <Link href="/shows" className="text-gray-400 hover:text-white text-sm">Shows</Link>
            <Link href="/watchlist" className="text-gray-400 hover:text-white text-sm">Watchlist</Link>
            <Link href="/lists" className="text-gray-400 hover:text-white text-sm">Lists</Link>
            <Link href="/stats" className="text-gray-400 hover:text-white text-sm">Stats</Link>
            <div className="ml-auto">
              <Link href="/settings" className="text-gray-400 hover:text-white text-sm">Settings</Link>
            </div>
          </nav>
        )}
        <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  )
}
