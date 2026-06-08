'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
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
  Swords,
  MoreHorizontal,
  X
} from 'lucide-react'

interface SidebarProps {
  userEmail?: string | null
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

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

  const primaryMobileItems = navItems.slice(0, 5)
  const moreDrawerItems = [
    ...navItems.slice(5),
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-[#09090B] border-r border-white/5 p-6 select-none">
        {/* Brand Logo */}
        <div className="flex items-center mb-8 px-2">
          <span className="font-extrabold text-2xl tracking-wide text-white">
            Dorf<span className="text-[#F97316]">Movies</span>
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
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userEmail}`} alt="User Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar (DorfMovies) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#09090B]/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <span className="font-extrabold text-xl tracking-wide text-white">
          Dorf<span className="text-[#F97316]">Movies</span>
        </span>
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400" />
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden">
             {userEmail ? <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userEmail}`} alt="User Avatar" /> : <User className="w-4 h-4 text-zinc-400" />}
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
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 rounded-t-2xl px-4 pt-4 pb-safe-bottom select-none"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm font-semibold text-zinc-300">More</span>
                <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 pb-4">
                {moreDrawerItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-medium transition-colors ${
                        isActive ? 'text-violet-400 bg-white/5' : 'text-zinc-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131316] border-t border-white/5 px-4 py-2 flex items-center justify-around pb-safe-bottom select-none">
        {primaryMobileItems.map((item) => {
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
        <button
          onClick={() => setMoreOpen(true)}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
            moreDrawerItems.some(i => i.href === pathname) ? 'text-violet-400' : 'text-zinc-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
