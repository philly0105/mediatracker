import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/LoginForm'

// /login is the only page most visitors ever see, so it is the one that most
// needs a real tab title; without this it inherited the bare 'DorfMovies'
// default and was indistinguishable from every other tab.
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your DorfMovies library.',
}

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
