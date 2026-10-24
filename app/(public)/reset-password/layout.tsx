import type { Metadata } from 'next'

// Client component below, so the title has to live in the segment layout. This
// page is reached from an emailed recovery link, which makes the tab title the
// only thing telling someone what they have just opened.
export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your DorfMovies account.',
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
