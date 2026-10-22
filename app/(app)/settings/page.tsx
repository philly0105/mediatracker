import type { Metadata } from 'next'
import type { ComponentType, CSSProperties } from 'react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShareToggle from '@/components/ShareToggle'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import ImportExportPanel from '@/components/ImportExportPanel'
import { KeyRound, Share2, ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Account, sharing and data settings.',
}

// Each settings section is one glass panel headed by its icon in a glass
// circle and the section title; the panel's aria-labelledby points at the h2.
function PanelHeader({ id, icon: Icon, title }: { id: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        aria-hidden="true"
        className="glass-btn inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-[var(--text-secondary)]"
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </span>
      <SectionHeader id={id} title={title} style={{ marginBottom: 0, paddingLeft: 0, flex: 1 }} />
    </div>
  )
}

const CARD_TITLE: CSSProperties = {
  margin: '0 0 16px',
  fontSize: 'var(--text-md)',
  lineHeight: '24px',
  fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-text)',
  color: 'var(--text-primary)',
}

export default async function SettingsPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '')

  return (
    <div className="max-w-[var(--content-narrow)] mx-auto md:mx-0">
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        sub="Manage your account, sharing preferences, and data."
      />

      <div className="space-y-6">
        {/* Account Section */}
        <Card as="section" variant="panel" aria-labelledby="settings-account">
          <PanelHeader id="settings-account" icon={KeyRound} title="Account" />
          <h3 style={CARD_TITLE}>Change Password</h3>
          <PasswordChangeForm />
        </Card>

        {/* Sharing Section */}
        <Card as="section" variant="panel" aria-labelledby="settings-sharing">
          <PanelHeader id="settings-sharing" icon={Share2} title="Sharing" />
          <p
            className="mb-4"
            style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-secondary)' }}
          >
            Create public links to share your library with friends. Anyone with the link can view your items, but they cannot edit them.
          </p>
          <div className="space-y-3">
            <ShareToggle
              label="Watched History"
              type="watched"
              token={settings?.watched_share_token ?? null}
              shareUrl={settings?.watched_share_token ? `${appUrl}/share/watched/${settings.watched_share_token}` : null}
            />
            <ShareToggle
              label="Watchlist"
              type="watchlist"
              token={settings?.watchlist_share_token ?? null}
              shareUrl={settings?.watchlist_share_token ? `${appUrl}/share/watchlist/${settings.watchlist_share_token}` : null}
            />
          </div>
        </Card>

        {/* Import / Export Section */}
        <Card as="section" variant="panel" id="import-export" className="scroll-mt-8" aria-labelledby="settings-import-export">
          <PanelHeader id="settings-import-export" icon={ArrowLeftRight} title="Import & Export" />
          <ImportExportPanel />
        </Card>
      </div>
    </div>
  )
}
