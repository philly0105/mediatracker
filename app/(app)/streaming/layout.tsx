import type { Metadata } from 'next'

// This route's page is a client component, which cannot export metadata — the
// segment layout is the only place it can live.
export const metadata: Metadata = {
  title: 'Streaming',
  description: 'Where the titles on your watchlist are streaming.',
}

export default function StreamingLayout({ children }: { children: React.ReactNode }) {
  return children
}
