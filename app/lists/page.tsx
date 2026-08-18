import { redirect } from 'next/navigation'

// Custom lists were removed — the watchlist and collections cover the same
// ground. The route lives on as a redirect so old bookmarks and share links
// land somewhere useful instead of a 404.
export default function ListsPage() {
  redirect('/watchlist')
}
