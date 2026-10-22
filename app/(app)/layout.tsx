import { Suspense } from 'react'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import SidebarMustWatch from '@/components/SidebarMustWatch'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import RecentAmbient from '@/components/RecentAmbient'

// The authenticated shell. Everything that needs a session lives under this
// group, so the auth read happens once here instead of in the root layout —
// where it made /login and the public /share pages dynamic too.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // getAuthenticatedUser returns null for "no session" and only throws on
  // genuine infrastructure failure; every page under this group awaits the
  // same react.cache'd call uncaught, so swallowing it here only produced a
  // nav-less error page. Let it throw to the error boundary.
  const user = await getAuthenticatedUser()

  return (
    /* MultiSelectProvider has to be the outer one. MediaModalProvider renders
       its modal stack as a *sibling* of its own children, so everything that
       stack owns sits at this level rather than inside the page — and
       MediaInfoModal renders SimilarModal, which calls useMultiSelect(). With
       the two the other way round that hook found no provider and threw, so
       "Similar Movies" hit the root error boundary and replaced the whole app.
       It only wraps children and a portal to document.body, so moving it out
       here changes no layout. */
    <MultiSelectProvider>
      {/* Wraps KeyboardShortcuts too: the ⌘K overlay opens media details
          through the same provider, so it has to be inside it. */}
      <MediaModalProvider>
        <Suspense>
          <KeyboardShortcuts />
        </Suspense>
        {/* The ambient layer's signed-in default (most recent watch). Its own
            Suspense so the query streams in behind the page instead of
            delaying it; it renders no markup. */}
        {user && (
          <Suspense>
            <RecentAmbient userId={user.id} />
          </Suspense>
        )}
        {/* The shell: from md up, a padded wrapper capped at --shell-max with
            the glass sidebar (or rail) in flow beside the content column. The
            sidebar used to be fixed and the page padded past it by hand, so
            three widths had to agree; now the flex row is the only layout.
            --shell-max measures sidebar plus gap plus content, the way the
            reference's content-box shell does, so the cap adds the padding
            back on top of it; under border-box alone the content column could
            never reach --content-max. */}
        <div className="relative z-10 flex min-h-screen flex-col md:mx-auto md:w-full md:max-w-[calc(var(--shell-max)_+_2_*_var(--shell-pad))] md:flex-row md:items-start md:gap-[var(--shell-pad)] md:p-[var(--shell-pad)]">
          {user && (
            <Sidebar
              userEmail={user.email}
              // The must-watch list is one extra query, so it streams in behind
              // the shell in its own Suspense rather than gating it.
              mustWatch={
                <Suspense>
                  <SidebarMustWatch userId={user.id} />
                </Suspense>
              }
            />
          )}

          {/* Under md the mobile bars are fixed, so the page clears them with
              its own top and bottom padding; from md up the wrapper's padding
              is the frame. */}
          <main className={`w-full min-w-0 flex-1 px-4 md:px-0 ${user ? 'pt-20 pb-24 md:py-0' : 'py-6 md:py-0'}`}>
            {/* One shared measure for every route. Without it the bento
                grid and library run the full width of an ultrawide display. */}
            <div className="mx-auto w-full max-w-[var(--content-max)]">
              {children}
            </div>
          </main>
        </div>
      </MediaModalProvider>
    </MultiSelectProvider>
  )
}
