import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import { AmbientHost } from '@/components/AmbientBackdrop'

// Inter variable with its optical-size axis: next/font only ships the weight
// axis unless asked, and without `opsz` the 28px headings render with the 14px
// text cut. `variable` exposes it as --font-inter, set on <html> so the
// --font-sans token declared at :root can resolve it.
const inter = Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-inter', display: 'swap' })

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
  // A private, invite-only tracker: nothing in it belongs in an index. A
  // robots.txt Disallow only stops the crawl — a URL discovered elsewhere can
  // still be listed from that alone — so the directive goes on the page. The
  // two /share pages set their own `robots`; metadata merge replaces a nested
  // object at the deepest segment that defines one, so theirs wins (with the
  // same values) and stays self-documenting next to their token comment.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  // Matches --surface-page, the canvas under the ambient layer.
  themeColor: '#061015',
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
    <html lang="en" className={inter.variable}>
      {/* Canvas and base text colour live in globals.css — an unlayered
          body rule outranks any Tailwind utility set here, so keeping both was
          only ever a way for the two to disagree. */}
      <body className={`${inter.className} min-h-screen relative antialiased`}>
        {/* First in the tab order, hidden until focused. Without it a keyboard
            user crosses the wordmark, the search trigger, nine nav items and
            up to five "Must watch" rows before reaching the page. The target
            is each group layout's <main id="main" tabIndex={-1}> — the
            tabindex is what lets focus actually land there, rather than the
            link only scrolling. `.skip-link` in globals.css does the rest. */}
        <a href="#main" className="skip-link sr-only focus:not-sr-only">
          Skip to content
        </a>

        {/* The one fixed layer behind the app: the featured title's backdrop
            blurred under a tint, or the tint alone when nothing has registered
            one. Pages register their art through <AmbientBackdrop>; see
            components/AmbientBackdrop.tsx for why they never paint their own. */}
        <AmbientHost />

        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
