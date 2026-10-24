import type { Metadata } from 'next'

// The page itself is a client component, and metadata is only supported in
// server components — so a segment layout is the only place this can live.
// It cannot go on (public)/layout.tsx either: that one is shared with /signup
// and the two /share routes, which set their own.
export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Send a password reset link to your email address.',
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
