'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type CSSProperties } from 'react'
import {
  Home,
  Search,
  Library,
  ListTodo,
  Sparkles,
  Clapperboard,
  CalendarDays,
  Layers,
  BarChart3,
  Settings,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Media } from '@/types'
import { NavItem } from './ui/NavItem'
import { Avatar } from './ui/Avatar'
import { Kbd } from './ui/Kbd'
import { openSearchOverlay } from '@/lib/searchOverlayBus'
import { useModal } from '@/lib/useModal'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useMediaActions, readCreatedEntry } from '@/lib/useMediaActions'
import { mediaToResult } from '@/lib/mediaToResult'

interface SidebarProps {
  userEmail?: string | null
  /** The "Must watch" section, streamed in by the (app) layout (see
   *  components/SidebarMustWatch.tsx). Nothing renders when it is omitted. */
  mustWatch?: React.ReactNode
}

type NavEntry = {
  name: string
  href: string
  icon: LucideIcon
  action?: 'search-overlay'
  /** The compact rail's label, when the name needs a break point to fit. */
  railName?: string
}

const PRIMARY_NAV: NavEntry[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search, action: 'search-overlay' },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles, railName: 'Recom\u00admendations' },
]

const MORE_NAV: NavEntry[] = [
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Franchises', href: '/collections', icon: Layers },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
]

// The sidebar and rail show every destination as one list; search is the
// field above it, not an entry.
const SHELL_NAV: NavEntry[] = [...PRIMARY_NAV.filter((item) => !item.action), ...MORE_NAV]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// The mark from the reference sidebar: a light rounded square with the "D"
// and its counter cut out. app/icon.tsx draws the same shape with literals
// because Satori resolves no CSS variables.
function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="31" height="31" rx="10" fill="var(--text-primary)" />
      <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill="var(--ink)" />
      <circle cx="16.2" cy="16" r="2.6" fill="var(--text-primary)" />
    </svg>
  )
}

const WORDMARK: CSSProperties = {
  fontSize: 17,
  lineHeight: '22px',
  fontWeight: 'var(--weight-heading)',
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
}

// The rail (md) stacks the icon over its label and the sidebar (lg) lays them
// out in a row. `.nav-item`'s row layout is unlayered CSS that utilities cannot
// override, so each entry renders both and the breakpoint shows one.
function ShellNavItem({ item, active }: { item: NavEntry; active: boolean }) {
  return (
    <>
      <div className="hidden lg:block">
        <NavItem href={item.href} icon={item.icon} label={item.name} active={active} />
      </div>
      <div className="lg:hidden">
        <NavItem href={item.href} icon={item.icon} label={item.name} railLabel={item.railName} active={active} stacked />
      </div>
    </>
  )
}

// Mobile bars and the More drawer: icon over an 11px label in a 14-radius
// pill. Active is the same brighter fill and top hairline as a nav item, never
// a coloured icon.
const TAB_CLASS =
  'flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[11px] leading-[14px] transition-colors'

// Forced colours strips the fill and the hairline that mark an active tab, the
// way it does for `.nav-item` in globals.css, so the state needs the system
// highlight there. `!` is what beats the inline background below.
const TAB_FORCED_ACTIVE = 'forced-colors:bg-[color:Highlight]! forced-colors:text-[color:HighlightText]!'

function tabClass(active: boolean, extra = TAB_CLASS) {
  return active ? `${extra} ${TAB_FORCED_ACTIVE}` : extra
}

function tabStyle(active: boolean): CSSProperties {
  return active
    ? {
        color: 'var(--text-primary)',
        fontWeight: 'var(--weight-semibold)',
        background: 'var(--glass-fill-active)',
        boxShadow: 'var(--inset-hairline)',
      }
    : { color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }
}

export default function Sidebar({ userEmail, mustWatch }: SidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryMobileItems = PRIMARY_NAV.slice(0, 4)
  const moreDrawerItems: NavEntry[] = [
    ...PRIMARY_NAV.slice(4),
    ...MORE_NAV,
    { name: 'Settings', href: '/settings', icon: Settings },
  ]
  const mobileMoreActive = moreDrawerItems.some((item) => isNavActive(pathname, item.href))
  const settingsActive = pathname === '/settings'

  return (
    <>
      {/* Desktop sidebar (lg) and compact rail (md): one in-flow glass panel
          that stretches to the page, with its contents stuck to the top of the
          viewport. The inner column scrolls on its own when a short viewport
          cannot show all of it, so Settings is always reachable. */}
      <aside
        aria-label="Sidebar"
        className="glass-panel glass-rim hidden md:block shrink-0 self-stretch w-[var(--rail-width)] lg:w-[var(--sidebar-width)] select-none"
      >
        <div
          className="sticky top-[var(--shell-pad)] flex flex-col gap-4 overflow-y-auto scrollbar-none px-1 pt-4 pb-3 lg:px-3"
          style={{ maxHeight: 'calc(100vh - 2 * var(--shell-pad))' }}
        >
          {/* Wordmark */}
          <div className="flex min-h-11 items-center justify-center gap-2 lg:justify-start lg:px-2">
            <Mark />
            <span className="hidden lg:inline" style={WORDMARK}>DorfMovies</span>
          </div>

          {/* Search is an action, not a destination — a field-shaped trigger reads
              as "summons the palette" and teaches the shortcut. The rail has no
              room for the field, so it shows the magnifier alone. */}
          <button
            type="button"
            onClick={openSearchOverlay}
            className="glass-inset hidden h-11 items-center gap-2 pl-3 pr-2 text-left text-sm lg:flex"
          >
            <Search size={18} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
            <span className="flex-1 truncate" style={{ color: 'var(--text-faint)' }}>Search…</span>
            <Kbd keys="K" />
          </button>
          <button
            type="button"
            onClick={openSearchOverlay}
            aria-label="Search"
            className="glass-btn mx-auto flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          {/* Navigation Items */}
          <nav aria-label="Main" className="flex flex-col gap-1 lg:gap-0.5">
            {SHELL_NAV.map((item) => (
              <ShellNavItem key={item.href} item={item} active={isNavActive(pathname, item.href)} />
            ))}
          </nav>

          {/* Rendered bare: it is a Suspense that resolves to the section or
              to nothing, and a wrapper would stay a flex item (and its gap)
              while it streams in or when the bucket is empty. */}
          {mustWatch}

          {/* Footer: a single Settings destination. The account initials moved
              to the page header with the greeting. */}
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-divider)' }}>
            <ShellNavItem item={{ name: 'Settings', href: '/settings', icon: Settings }} active={settingsActive} />
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar (DorfMovies). The bars blur at 24px rather than the
          panel's 40px: they sit over scrolling content, so they are the one
          place the blur is repainted every frame. */}
      <div className="glass-panel glass-rim md:hidden fixed top-0 left-0 right-0 z-40 rounded-none flex items-center justify-between px-4 py-2.5 [--glass-blur:var(--blur-md)]">
        <span className="flex items-center gap-2">
          <Mark />
          <span style={WORDMARK}>DorfMovies</span>
        </span>
        <div className="flex items-center gap-2">
          {/* Was a bare icon with no link and no handler: it looked tappable
              and did nothing. */}
          <button
            type="button"
            onClick={openSearchOverlay}
            aria-label="Search"
            className="glass-btn flex h-11 w-11 items-center justify-center rounded-full"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>
          <Link href="/settings" aria-label="Settings" className="rounded-full">
            <Avatar email={userEmail} />
          </Link>
        </div>
      </div>

      {/* Mobile More Drawer */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 motion-backdrop-fade"
            style={{ background: 'var(--scrim)' }}
            onClick={() => setMoreOpen(false)}
          />
          <MoreDrawerPanel
            items={moreDrawerItems}
            pathname={pathname}
            onClose={() => setMoreOpen(false)}
          />
        </>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Main"
        className="glass-panel glass-rim md:hidden fixed bottom-0 left-0 right-0 z-40 rounded-none px-2 pt-1.5 flex items-center justify-around pb-safe-bottom select-none [--glass-blur:var(--blur-md)]"
      >
        {primaryMobileItems.map((item) => {
          const isActive = isNavActive(pathname, item.href)
          const Icon = item.icon

          if (item.action === 'search-overlay') {
            return (
              <button
                key={item.href}
                type="button"
                onClick={openSearchOverlay}
                className={TAB_CLASS}
                style={tabStyle(false)}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{item.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={tabClass(isActive)}
              style={tabStyle(isActive)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={tabClass(mobileMoreActive)}
          style={tabStyle(mobileMoreActive)}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}

export type MustWatchMedia = Pick<
  Media,
  'tmdb_id' | 'type' | 'title' | 'overview' | 'poster_url' | 'release_year' | 'genres' | 'vote_average'
>

export interface MustWatchItem {
  id: string
  media: MustWatchMedia
}

const THUMB_RING = '0 0 0 1px var(--border-medium)'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * The sidebar's "Must watch" mini-list: five poster thumbs and the bucket's
 * total. A row opens the title in the media modal with the watchlist page's
 * handler set, keyed by the watchlist row id: the priority switcher, removal
 * by row, and marking watched also deleting the row (the default handlers
 * only post the watch, which would leave the title in this list). Each one
 * closes the modal and refreshes the route so the list and count follow; the
 * page's local-state Undo has no equivalent here.
 */
export function MustWatchList({ items, total }: { items: MustWatchItem[]; total: number }) {
  const router = useRouter()
  const { openMedia, closeMedia } = useMediaModal()
  const { markWatched } = useMediaActions()

  if (items.length === 0) return null

  function openItem(item: MustWatchItem) {
    const deleteRow = () =>
      fetch('/api/watchlist', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ id: item.id }) })
    const settle = () => {
      closeMedia()
      router.refresh()
    }
    openMedia(mediaToResult(item.media), {
      // Already on the watchlist, so "Add" has nothing to do.
      onAddToWatchlist: async () => {},
      currentPriority: 'must_watch',
      onUpdatePriority: async (priority) => {
        const res = await fetch('/api/watchlist', {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify({ id: item.id, priority }),
        })
        if (!res.ok) throw new Error('Could not move that item.')
        settle()
      },
      onRemoveFromWatchlist: async () => {
        const res = await deleteRow()
        if (!res.ok) throw new Error('Could not remove that item.')
        settle()
      },
      onMarkAsWatched: async (opts) => {
        const res = await markWatched(item.media.tmdb_id, item.media.type, opts)
        await deleteRow()
        settle()
        return readCreatedEntry(res)
      },
    })
  }

  return (
    <section
      aria-labelledby="sidebar-must-watch"
      className="hidden border-t pt-3.5 lg:block"
      style={{ borderColor: 'var(--border-divider)' }}
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <h2 id="sidebar-must-watch" className="text-xs font-semibold leading-4" style={{ color: 'var(--text-muted)' }}>
          Must watch
        </h2>
        <span className="tabular text-xs font-medium leading-4" style={{ color: 'var(--text-muted)' }}>
          {total}
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openItem(item)}
              className="flex h-11 w-full items-center gap-3 rounded-[var(--radius-md)] pl-[11px] pr-3 text-left text-[13px] font-medium transition-colors hover:bg-[var(--glass-fill-hover)]"
              style={{ color: 'var(--text-strong)' }}
            >
              {item.media.poster_url ? (
                <Image
                  src={item.media.poster_url}
                  alt=""
                  width={22}
                  height={33}
                  className="h-[33px] w-[22px] shrink-0 rounded-[4px] object-cover"
                  style={{ boxShadow: THUMB_RING }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="h-[33px] w-[22px] shrink-0 rounded-[4px]"
                  style={{ background: 'var(--glass-chip)', boxShadow: THUMB_RING }}
                />
              )}
              <span className="truncate">{item.media.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

const DRAWER_TILE_CLASS =
  'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] p-3 text-[11px] leading-[14px] transition-colors'

/**
 * Split out of the sidebar so it mounts only while the drawer is open — that
 * is what scopes useModal's body scroll lock to the drawer's lifetime.
 *
 * It previously had none of this: no dialog role, no Escape, no focus trap and
 * no scroll lock, while every other overlay in the app was already wired to
 * useModal.
 */
function MoreDrawerPanel({
  items,
  pathname,
  onClose,
}: {
  items: NavEntry[]
  pathname: string
  onClose: () => void
}) {
  const { containerRef } = useModal(onClose)

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="More navigation"
      className="glass-panel glass-rim md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-b-none rounded-t-[var(--radius-2xl)] px-4 pt-3 pb-safe-bottom select-none motion-sheet-up [--glass-blur:var(--blur-md)]"
    >
      <div className="mb-3 flex items-center justify-between pl-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>More</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="glass-btn flex h-11 w-11 items-center justify-center rounded-full"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 pb-4">
        {items.map((item) => {
          const isActive = isNavActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              onClick={onClose}
              className={tabClass(isActive, DRAWER_TILE_CLASS)}
              style={tabStyle(isActive)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
