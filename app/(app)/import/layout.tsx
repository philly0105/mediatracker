import type { Metadata } from 'next'

// This route's page is a client component, which cannot export metadata — the
// segment layout is the only place it can live.
export const metadata: Metadata = {
  title: 'Import',
  description: 'Bring a watch history in from a CSV.',
}

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return children
}
