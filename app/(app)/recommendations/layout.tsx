import type { Metadata } from 'next'

// This route's page is a client component, which cannot export metadata — the
// segment layout is the only place it can live.
export const metadata: Metadata = {
  title: 'Recommendations',
  description: 'Titles picked from what you have already watched.',
}

export default function RecommendationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
