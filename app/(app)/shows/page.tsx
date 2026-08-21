import { redirect } from 'next/navigation'

// The old per-type library routes live on as redirects so bookmarks and
// shared filter URLs keep working.
export default async function ShowsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  params.set('type', 'show')
  redirect(`/library?${params.toString()}`)
}
