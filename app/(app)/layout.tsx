import { Suspense } from 'react'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { MediaModalProvider } from '@/components/MediaModalProvider'

// The authenticated shell. Everything that needs a session lives under this
// group, so the auth read happens once here instead of in the root layout —
// where it made /login and the public /share pages dynamic too.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    // The cached helper, not a bare getUser(): every page under this layout
    // resolves the user too, and react.cache() collapses the two calls into one
    // round-trip per render rather than one each.
    user = await getAuthenticatedUser()
  } catch {
    // Supabase unavailable — render without auth nav
  }

  return (
    // MultiSelectProvider has to be the outer one. MediaModalProvider renders
    // its modal stack as a *sibling* of its own children, so everything that
    // stack owns sits at this level rather than inside the page — and
    // MediaInfoModal renders SimilarModal, which calls useMultiSelect(). With
    // the two the other way round that hook found no provider and threw, so
    // "Similar Movies" hit the root error boundary and replaced the whole app.
    // It only wraps children and a portal to document.body, so moving it out
    // here changes no layout.
    <MultiSelectProvider>
      {/* Wraps KeyboardShortcuts too: the ⌘K overlay opens media details
          through the same provider, so it has to be inside it. */}
      <MediaModalProvider>
        <Suspense>
          <KeyboardShortcuts />
        </Suspense>
        <div className="relative z-10 min-h-screen flex flex-col md:flex-row">
          {user && <Sidebar userEmail={user.email} />}

          {/* transition-[padding-left], not transition-all: padding-left is the
              only thing here that ever animates, and `all` made the browser
              watch every animatable property on the one element whose entire
              subtree is replaced on every navigation. */}
          <main className={`flex-1 w-full px-4 py-6 md:px-8 md:py-8 transition-[padding-left] duration-300 ${
            // pl = the rail's own width plus the page's md:px-8 gutter, both read
            // from the token. It used to be a literal md:pl-72 (288px) against a
            // 256px --sidebar-width, so the three numbers could drift apart.
            user ? 'pt-20 md:pt-8 md:pl-[calc(var(--sidebar-width)+2rem)] pb-24 md:pb-8' : 'pb-8'
          }`}>
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
