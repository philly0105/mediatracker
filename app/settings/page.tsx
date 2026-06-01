import { createClient } from '@/lib/supabase/server'
import ShareToggle from '@/components/ShareToggle'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('user_settings').select('*').single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="bg-gray-900 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Sharing</h2>
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
    </div>
  )
}
