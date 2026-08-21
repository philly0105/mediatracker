import { redirect } from 'next/navigation'

// The search page was replaced by the ⌘K overlay; the route lives on as a
// redirect so old bookmarks land in a search box. KeyboardShortcuts opens
// the overlay when it sees ?search=1.
export default function SearchPage() {
  redirect('/?search=1')
}
