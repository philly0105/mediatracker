import type { Metadata } from 'next'

// This route's page is a client component, which cannot export metadata — the
// segment layout is the only place it can live.
export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'What you plan to watch next.',
}

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children
}
