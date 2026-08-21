import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

// The page is a client component, so its title has to be resolved here. This is
// the app's most deep-linked route — Continue Watching, bookmarks and shared
// links all land on it — and every one of them used to read "DorfMovies".
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('media')
      .select('title, overview, poster_url, release_year')
      .eq('id', id)
      .maybeSingle()

    if (!data) return { title: 'Show' }

    const title = data.release_year ? `${data.title} (${data.release_year})` : data.title
    return {
      title,
      description: data.overview ?? undefined,
      openGraph: {
        title: `${title} · DorfMovies`,
        description: data.overview ?? undefined,
        images: data.poster_url ? [data.poster_url] : undefined,
      },
    }
  } catch {
    // A metadata failure must not take the page down with it.
    return { title: 'Show' }
  }
}

export default function ShowLayout({ children }: { children: React.ReactNode }) {
  return children
}
