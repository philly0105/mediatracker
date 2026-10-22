import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import DashboardSearchBar from '@/components/DashboardSearchBar'
import HomeGreeting from './HomeGreeting'
import { firstNameFromEmail, timeKey } from './greeting'

/**
 * The Home header: date eyebrow, greeting, and on the right the "Log a watch"
 * pill and the account avatar. The avatar moved here from the desktop
 * sidebar; under md the fixed mobile top bar still shows its own, so this one
 * hides there rather than appearing twice on one screen.
 */
export default function HomeHeader({ email }: { email?: string | null }) {
  return (
    <header
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '4px 0 0 4px' }}
    >
      <div style={{ minWidth: 0 }}>
        <HomeGreeting name={firstNameFromEmail(email)} serverKey={timeKey(new Date())} />
      </div>
      <div className="hidden md:flex items-center gap-3" style={{ flex: 'none' }}>
        <DashboardSearchBar />
        <Link href="/settings" aria-label="Settings" className="rounded-full">
          <Avatar email={email} />
        </Link>
      </div>
    </header>
  )
}
