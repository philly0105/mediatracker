import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShareToggle from '@/components/ShareToggle'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import ImportExportPanel from '@/components/ImportExportPanel'
import { KeyRound, Share2, ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Account, sharing and data settings.',
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
    <div className="space-y-8 max-w-2xl mx-auto md:mx-0">
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        sub="Manage your account, sharing preferences, and data."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="p-1.5 rounded-sm border border-[var(--green-tint-border)] bg-[var(--green-tint-bg)]">
              <KeyRound className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Account</h2>
          </div>
          
          <Card>
            <h3 className="text-sm font-bold text-white mb-4">Change Password</h3>
            <PasswordChangeForm />
          </Card>
        </section>

        {/* Sharing Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="p-1.5 rounded-sm border border-[var(--green-tint-border)] bg-[var(--green-tint-bg)]">
              <Share2 className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Sharing</h2>
          </div>

          <Card className="space-y-6">
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Create public links to share your library with friends. Anyone with the link can view your items, but they cannot edit them.
            </p>
            <div className="space-y-6">
              <ShareToggle
                label="Watched History"
                type="watched"
                token={settings?.watched_share_token ?? null}
                shareUrl={settings?.watched_share_token ? `${appUrl}/share/watched/${settings.watched_share_token}` : null}
              />
              <div className="h-px w-full bg-[var(--border-subtle)]" />
              <ShareToggle
                label="Watchlist"
                type="watchlist"
                token={settings?.watchlist_share_token ?? null}
                shareUrl={settings?.watchlist_share_token ? `${appUrl}/share/watchlist/${settings.watchlist_share_token}` : null}
              />
            </div>
          </Card>
        </section>
      </div>

      {/* Import / Export Section */}
      <section id="import-export" className="space-y-4 scroll-mt-8">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="p-1.5 rounded-sm border border-[var(--green-tint-border)] bg-[var(--green-tint-bg)]">
            <ArrowLeftRight className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Import &amp; Export</h2>
        </div>
        <ImportExportPanel />
      </section>
    </div>
  )
}
