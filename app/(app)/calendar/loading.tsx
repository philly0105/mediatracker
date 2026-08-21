import { RowListSkeleton } from '@/components/ui/Skeleton'

// The calendar used to fetch client-side and render this skeleton while it waited.
// Now that the page fetches on the server, the same skeleton belongs here — without
// it, navigating to /calendar blocks on TMDB behind a blank screen.
export default function CalendarLoading() {
  return <RowListSkeleton count={4} />
}
