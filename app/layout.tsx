import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'

const outfit = Outfit({ subsets: ['latin'] })

// `metadataBase` resolves the relative OG image paths below into absolute URLs;
// without it Next warns and social cards fall back to no image at all.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dorfmovies.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // The template is what gives every route its own tab title. Before this, all
  // 40-odd of them read "DorfMovies", so history and bookmarks were unusable.
  title: {
    default: 'DorfMovies',
    template: '%s · DorfMovies',
  },
  description: 'Track your movies, TV shows, and watchlists.',
  applicationName: 'DorfMovies',
  openGraph: {
    siteName: 'DorfMovies',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  // Matches --bg-base. It was #030303, a cold near-black the app never uses.
  themeColor: '#100e09',
  // Without this the safe-area insets resolve to 0, so `pb-safe-bottom` on the
  // mobile nav has nothing to read and the bar sits under the home indicator.
  viewportFit: 'cover',
}

// This layout deliberately does not touch Supabase. It used to await the user so
// it could decide whether to render the Sidebar, which forced every route in the
// app — /login, /signup and the two public /share pages included — to be
// server-rendered on demand. The authenticated shell now lives in
// app/(app)/layout.tsx, and the routes that have no session live under
// app/(public).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Canvas, grain and base text colour live in globals.css — an unlayered
          body rule outranks any Tailwind utility set here, so keeping both was
          only ever a way for the two to disagree. */}
      <body className={`${outfit.className} min-h-screen relative antialiased`}>
        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="ambient-orb absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px] opacity-20"
            style={{ background: 'var(--orb-violet)' }} />
          <div className="ambient-orb absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px] opacity-20"
            style={{ background: 'var(--orb-rose)' }} />
          <div className="ambient-orb absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
            style={{ background: 'var(--orb-orange)' }} />
        </div>

        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
