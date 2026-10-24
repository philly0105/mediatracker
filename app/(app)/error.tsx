'use client'

import { SectionError } from '@/components/ui/SectionError'

// The dashboard is app/(app)/page.tsx, so its boundary can only live at the
// group root — which also makes this the fallback for the redirect-only stubs
// (/lists, /movies, /shows, /search, /import) that have no boundary of their
// own. Every route that actually renders something has one beside it, so in
// practice this is the dashboard's. It sits inside app/(app)/layout.tsx, which
// is the point: app/error.tsx renders above the shell and takes the sidebar,
// the nav and the mobile bars down with the page.
export default function DashboardError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SectionError {...props} title="Your dashboard didn't load" message="Something failed while building your dashboard. Try again — your data is safe." />
}
