import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DorfMovies',
  description: 'Track your movies, TV shows, and watchlists.',
}

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
      <body className={`${outfit.className} bg-[var(--surface-page)] text-zinc-100 min-h-screen relative antialiased bg-[var(--page-radial)] bg-fixed`}>
        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px] opacity-20"
            style={{ background: 'var(--orb-violet)' }} />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px] opacity-20"
            style={{ background: 'var(--orb-rose)' }} />
          <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
            style={{ background: 'var(--orb-orange)' }} />
        </div>

        {/* Layout wrapper */}
        <div className="relative z-10 min-h-screen flex flex-col md:flex-row">
          {user && <Sidebar userEmail={user.email} />}
          
          <main className={`flex-1 w-full px-4 py-6 md:px-8 md:py-8 transition-all duration-300 ${
            user ? 'md:pl-72 pb-24 md:pb-8' : 'pb-8'
          }`}>
            <MultiSelectProvider>
              {children}
            </MultiSelectProvider>
          </main>
        </div>
      </body>
    </html>
  )
}
