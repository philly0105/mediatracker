import Link from 'next/link'
import SignupForm from '@/components/SignupForm'
import { AuthShell, AuthError } from '@/components/AuthShell'

// Server component so it can read the server-only SIGNUP_INVITE_CODE. With no
// code set the route already refuses every request, so showing a form here
// would only be a way to waste someone's time.
export default function SignupPage() {
  if (!process.env.SIGNUP_INVITE_CODE) {
    return (
      <AuthShell title="Signup is closed" subtitle="This instance is invite-only.">
        <AuthError>No accounts can be created here right now.</AuthError>
        <p className="text-xs text-zinc-500 text-center">
          <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">Back to sign in</Link>
        </p>
      </AuthShell>
    )
  }
  return <SignupForm />
}
