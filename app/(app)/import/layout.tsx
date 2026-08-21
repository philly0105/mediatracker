import type { Metadata } from 'next'

// The page is a bare server redirect and never renders, so this title only ever
// shows in the split second before the browser follows the Location header.
// Kept because /settings#import-export is a deep link people bookmark.
export const metadata: Metadata = {
  title: 'Import',
  description: 'Bring a watch history in from a CSV.',
}

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return children
}
