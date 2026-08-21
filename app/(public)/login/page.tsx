import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

// A server component purely so it can read SIGNUP_INVITE_CODE: the variable is
// not NEXT_PUBLIC_, so a client component has no way to know whether signup
// exists on this instance, and would offer a link that always 503s.
export default function LoginPage() {
  // useSearchParams inside LoginForm needs a boundary; without one the whole
  // route opts out of static rendering and the build says so.
  return (
    <Suspense>
      <LoginForm signupEnabled={Boolean(process.env.SIGNUP_INVITE_CODE)} />
    </Suspense>
  )
}
