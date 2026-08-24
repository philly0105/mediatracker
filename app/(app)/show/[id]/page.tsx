import { notFound, redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { loadShowDetails } from '@/lib/showDetails'
import ShowDetailClient from '@/components/ShowDetailClient'

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const details = await loadShowDetails({
    supabase,
    userId: user.id,
    mediaId: id,
  })

  if (!details) {
    notFound()
  }

  return <ShowDetailClient mediaId={id} initialDetails={details} />
}
