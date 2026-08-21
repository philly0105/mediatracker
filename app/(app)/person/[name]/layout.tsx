import type { Metadata } from 'next'

// The page is a client component; the name is already in the URL, so no fetch
// is needed to give the route a real title.
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const person = decodeURIComponent(name)

  return {
    title: person,
    description: `Movies and shows featuring ${person} in your library.`,
  }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return children
}
