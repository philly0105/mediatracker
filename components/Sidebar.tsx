'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Search,
  Film,
  Tv,
  ListTodo,
  Library,
  Layers,
  BarChart3,
  Upload,
  Settings,
  User,
  Sparkles,
  Calendar,
  Swords
} from 'lucide-react'

interface SidebarProps {
  userEmail?: string | null
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Movies', href: '/movies', icon: Film },
    { name: 'Shows', href: '/shows', icon: Tv },
    { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
    { name: 'Collections', href: '/collections', icon: Library },
    { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
    { name: 'Versus', href: '/versus', icon: Swords },
    { name: 'Lists', href: '/lists', icon: Layers },
    { name: 'Stats', href: '/stats', icon: BarChart3 },
    { name: 'Import', href: '/import', icon: Upload },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 glass-panel border-r border-white/5 p-6 select-none">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-orange-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-white font-black text-sm">M</span>
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight bg-clip-text">
            MediaTracker
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-white/5 rounded-xl border border-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Info / Settings */}
        <div className="mt-auto border-t border-white/5 pt-4 space-y-1">
          <Link
            href="/settings"
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
              pathname === '/settings'
                ? 'text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {pathname === '/settings' && (
              <motion.div
                layoutId="activeNavIndicator"
                className="absolute inset-0 bg-white/5 rounded-xl border border-white/10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Settings
              className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                pathname === '/settings' ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}
            />
            <span className="relative z-10">Settings</span>
          </Link>

          {userEmail && (
            <div className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-white/[0.01] border border-white/[0.03]">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/5 px-4 py-2 flex items-center justify-around pb-safe-bottom select-none">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
                isActive ? 'text-violet-400' : 'text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
        <Link
          href="/settings"
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
            pathname === '/settings' ? 'text-violet-400' : 'text-zinc-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </>
  )
}
