import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DorfMovies',
    short_name: 'DorfMovies',
    description: 'Track your movies, TV shows, and watchlists.',
    start_url: '/',
    display: 'standalone',
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
  }
}
