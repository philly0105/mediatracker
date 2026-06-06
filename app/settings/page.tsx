import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShareToggle from '@/components/ShareToggle'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import { KeyRound, Share2 } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase.from('user_settings').select('*').single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="space-y-8 max-w-2xl mx-auto md:mx-0">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm text-zinc-400">
          Manage your account and sharing preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
            <div className="p-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <KeyRound className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Account</h2>
          </div>
          
          <div className="glass-card rounded-3xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">Change Password</h3>
            <PasswordChangeForm />
          </div>
        </section>

        {/* Sharing Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
            <div className="p-1.5 rounded-lg border border-teal-500/20 bg-teal-500/5">
              <Share2 className="w-4 h-4 text-teal-400" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Sharing</h2>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
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
              <div className="h-px w-full bg-white/5" />
              <ShareToggle
                label="Watchlist"
                type="watchlist"
                token={settings?.watchlist_share_token ?? null}
                shareUrl={settings?.watchlist_share_token ? `${appUrl}/share/watchlist/${settings.watchlist_share_token}` : null}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
