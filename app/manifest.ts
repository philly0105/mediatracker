import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DorfMovies',
    short_name: 'DorfMovies',
    description: 'Track your movies, TV shows, and watchlists.',
    start_url: '/',
    display: 'standalone',
    // #030303 is a cold near-black; the app canvas is warm (--bg-base),
    // so the PWA splash and status bar visibly disagreed with the app.
    background_color: '#100e09',
    theme_color: '#100e09',
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
