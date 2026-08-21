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
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
