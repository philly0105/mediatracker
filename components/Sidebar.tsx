'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  Home,
  Search,
  ListTodo,
  Library,
  List,
  Layers,
  BarChart3,
  Settings,
  User,
  Sparkles,
  Clapperboard,
  MoreHorizontal,
  X
} from 'lucide-react'
import { NavItem } from './ui/NavItem'
import { openSearchOverlay } from '@/lib/searchOverlayBus'

interface SidebarProps {
  userEmail?: string | null
}

type NavEntry = {
  name: string
  href: string
  icon: React.ComponentType<any>
  action?: 'search-overlay'
}

const PRIMARY_NAV: NavEntry[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search, action: 'search-overlay' },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
]

const MORE_NAV: NavEntry[] = [
  { name: 'Lists', href: '/lists', icon: List },
  { name: 'Franchises', href: '/collections', icon: Layers },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryMobileItems = PRIMARY_NAV.slice(0, 4)
  const moreDrawerItems: NavEntry[] = [
    ...PRIMARY_NAV.slice(4),
    ...MORE_NAV,
    { name: 'Settings', href: '/settings', icon: Settings },
  ]
  const mobileMoreActive = moreDrawerItems.some((item) => isNavActive(pathname, item.href))

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 p-6 select-none"
        style={{
          background: 'var(--bg-base)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Brand Logo */}
        <div className="flex items-center mb-8 px-2">
          <span className="font-extrabold text-2xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Dorf<span style={{ color: 'var(--brand-mark)' }}>Movies</span>
          </span>
        </div>

        {/* Search is an action, not a destination — a field-shaped trigger reads
            as "summons the palette" and teaches the shortcut. */}
        <button
          type="button"
          onClick={openSearchOverlay}
          className="w-full h-9 mb-6 px-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-white/[0.03] transition-colors text-left"
        >
          <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-zinc-500 truncate">Search…</span>
          <kbd className="inline-flex items-center text-[10px] font-semibold text-zinc-500 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-none">
          {PRIMARY_NAV.filter((item) => !item.action).map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={isNavActive(pathname, item.href)}
            />
          ))}

          {/* Divider between primary and secondary destinations */}
          <div aria-hidden style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 12px' }} />

          {MORE_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={isNavActive(pathname, item.href)}
            />
          ))}
        </nav>

        {/* Footer: a single Settings destination — the account card moves
            into the row so the whole thing is one tappable link. */}
        <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {userEmail ? (
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-[var(--radius-md)] transition-colors"
              style={{
                padding: '10px 12px',
                background: pathname === '/settings' ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${pathname === '/settings' ? 'var(--border-default)' : 'var(--border-faint)'}`,
              }}
            >
              <img
                src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail)}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--zinc-800)', border: '1px solid var(--border-subtle)' }}
              />
              <p
                className="flex-1"
                style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
              >
                {userEmail.split('@')[0]}
              </p>
              <Settings className="w-4 h-4 flex-shrink-0" style={{ color: pathname === '/settings' ? 'var(--accent)' : 'var(--text-muted)' }} />
            </Link>
          ) : (
            <NavItem href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} />
          )}
        </div>
      </aside>

      {/* Mobile Top Bar (DorfMovies) */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(36, 31, 23, 0.9)',
          backdropFilter: 'blur(var(--blur-md))',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span className="font-extrabold text-xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Dorf<span style={{ color: 'var(--brand-mark)' }}>Movies</span>
        </span>
        <div className="flex items-center gap-3">
          {/* Was a bare icon with no link and no handler: it looked tappable
              and did nothing. */}
          <button
            type="button"
            onClick={openSearchOverlay}
            aria-label="Search"
            className="p-1 -m-1 rounded-sm transition-colors hover:text-white"
          >
            <Search className="w-5 h-5 text-zinc-400" />
          </button>
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: 'var(--zinc-800)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {userEmail ? (
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userEmail)}`} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </Link>
        </div>
      </div>

      {/* Mobile More Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-4 pb-safe-bottom select-none"
              style={{
                background: 'var(--glass-panel)',
                borderTop: '1px solid var(--border-subtle)',
                borderTopLeftRadius: 'var(--radius-2xl)',
                borderTopRightRadius: 'var(--radius-2xl)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 rounded-sm hover:text-white transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 pb-4">
                {moreDrawerItems.map((item) => {
                  const isActive = isNavActive(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-md text-[10px] font-medium transition-colors"
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--border-default)' : 'transparent'}`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-around pb-safe-bottom select-none"
        style={{
          background: 'var(--bg-bar)',
          borderTop: '1px solid var(--border-subtle)',
        }}
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
                className="relative flex flex-col items-center gap-1 p-2 rounded-md text-[10px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Icon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <span>{item.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 p-2 rounded-md text-[10px] font-medium transition-colors"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-5 h-5" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span>{item.name}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-col items-center gap-1 p-2 rounded-md text-[10px] font-medium transition-colors"
          style={{
            color: mobileMoreActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <MoreHorizontal
            className="w-5 h-5"
            style={{ color: mobileMoreActive ? 'var(--accent)' : 'var(--text-muted)' }}
          />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
