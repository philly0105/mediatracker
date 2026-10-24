import type { Metadata } from 'next'
import SignupForm from '@/components/SignupForm'
import { AuthShell, AuthError, AuthLink } from '@/components/AuthShell'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a DorfMovies account with an invite code.',
}

// Server component so it can read the server-only SIGNUP_INVITE_CODE. With no
// code set the route already refuses every request, so showing a form here
// would only be a way to waste someone's time.
export default function SignupPage() {
  if (!process.env.SIGNUP_INVITE_CODE) {
    return (
      <AuthShell title="Signup is closed" subtitle="This instance is invite-only.">
        <AuthError>No accounts can be created here right now.</AuthError>
        <p className="-my-3 text-center">
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      </AuthShell>
    )
  }
  return <SignupForm />
}
