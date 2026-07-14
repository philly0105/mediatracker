'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  Home,
  Search,
  Film,
  Tv,
  ListTodo,
  Library,
  Layers,
  BarChart3,
  Settings,
  User,
  Sparkles,
  Calendar,
  Swords,
  Clapperboard,
  MoreHorizontal,
  X
} from 'lucide-react'
import { NavItem } from './ui/NavItem'

interface SidebarProps {
  userEmail?: string | null
}

type NavEntry = {
  name: string
  href: string
  icon: React.ComponentType<any>
}

const PRIMARY_NAV: NavEntry[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Movies', href: '/movies', icon: Film },
  { name: 'Shows', href: '/shows', icon: Tv },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
]

const MORE_NAV: NavEntry[] = [
  { name: 'Lists', href: '/lists', icon: Layers },
  { name: 'Versus', href: '/versus', icon: Swords },
  { name: 'Collections', href: '/collections', icon: Library },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const moreActive = MORE_NAV.some((item) => isNavActive(pathname, item.href))
  const [moreOpen, setMoreOpen] = useState(false)
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(moreActive)

  // Keep desktop More expanded when navigating into one of its routes
  useEffect(() => {
    if (moreActive) setDesktopMoreOpen(true)
  }, [moreActive])

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

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-none">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} passHref legacyBehavior>
              <NavItem
                icon={item.icon}
                label={item.name}
                active={isNavActive(pathname, item.href)}
              />
            </Link>
          ))}

          {/* More section */}
          <NavItem
            icon={MoreHorizontal}
            label="More"
            active={moreActive && !desktopMoreOpen}
            onClick={() => setDesktopMoreOpen((open) => !open)}
          />
          <AnimatePresence initial={false}>
            {desktopMoreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col gap-1 pl-3 ml-3"
                style={{ borderLeft: '1px solid var(--border-subtle)' }}
              >
                {MORE_NAV.map((item) => (
                  <Link key={item.href} href={item.href} passHref legacyBehavior>
                    <NavItem
                      icon={item.icon}
                      label={item.name}
                      active={isNavActive(pathname, item.href)}
                    />
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Footer Info / Settings */}
        <div className="mt-auto pt-4 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Link href="/settings" passHref legacyBehavior>
            <NavItem
              icon={Settings}
              label="Settings"
              active={pathname === '/settings'}
            />
          </Link>

          {userEmail && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                marginTop: 8,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(236, 231, 218, 0.01)',
                border: '1px solid var(--border-faint)',
              }}
            >
              <img
                src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail)}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--zinc-800)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userEmail.split('@')[0]}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userEmail}
                </p>
              </div>
            </div>
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
          <Search className="w-5 h-5 text-zinc-400" />
          <div
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
          </div>
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
