import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable identity, so a later change to start_url does not make browsers
    // treat this as a different app and orphan the copy someone has installed.
    id: '/',
    name: 'DorfMovies',
    short_name: 'DorfMovies',
    description: 'Track your movies, TV shows, and watchlists.',
    start_url: '/',
    // Without a scope an outbound link opens inside the installed window with
    // no address bar and no way back; with it, anything outside the app hands
    // off to the browser instead.
    scope: '/',
    display: 'standalone',
    // No `orientation`: setting one locks the installed app to it. The poster
    // grids, stats and calendar all use the width on a tablet or a phone held
    // sideways, and the browser tab never imposed a lock either.
    lang: 'en',
    dir: 'ltr',
    categories: ['entertainment', 'lifestyle', 'utilities'],
    // The canvas (--surface-page), so the PWA splash and status bar agree with
    // the app instead of showing a different near-black.
    background_color: '#061015',
    theme_color: '#061015',
    // All three were the Vercel triangle the starter shipped, so installing the
    // app to a home screen gave you someone else's logo. Regenerated from the
    // same mark app/icon.tsx and app/apple-icon.tsx draw.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Its own file, not the 512 again: Android crops a maskable icon to a
      // circle inscribed in the middle 80%, which would cut into a glyph sized
      // for the full canvas.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the home-screen icon. /?search=1 is what the retired /search
    // route redirects to, and KeyboardShortcuts opens the overlay when it sees
    // that param.
    shortcuts: [
      { name: 'Library', url: '/library', description: 'Everything you have watched.' },
      { name: 'Watchlist', url: '/watchlist', description: 'What you plan to watch next.' },
      { name: 'Search', url: '/?search=1', description: 'Search your library and TMDB.' },
    ],
  }
}
