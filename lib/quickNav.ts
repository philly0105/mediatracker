import type { ComponentType } from 'react'
import {
  Home, Library, ListTodo, Clapperboard, Sparkles, Layers, BarChart3, Calendar, Settings,
} from 'lucide-react'

export interface QuickNavItem {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  /**
   * The second key of the `g`-prefixed jump (g then l → Library). Chosen from
   * the destination's own name wherever the initial is free; Settings takes the
   * conventional comma.
   */
  key: string
}

/**
 * Every destination the palette and the keyboard can reach. One list, because
 * the ⌘K "Go to" section, the g-prefixed shortcuts and the help sheet all
 * enumerate the same places and drifted apart when each kept its own copy.
 */
export const QUICK_NAV: QuickNavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home, key: 'h' },
  { name: 'Library', href: '/library', icon: Library, key: 'l' },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo, key: 'w' },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard, key: 's' },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles, key: 'r' },
  { name: 'Franchises', href: '/collections', icon: Layers, key: 'f' },
  { name: 'Stats', href: '/stats', icon: BarChart3, key: 't' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, key: 'c' },
  { name: 'Settings', href: '/settings', icon: Settings, key: ',' },
]

/** How long after `g` the second key still counts as part of the chord. */
export const G_CHORD_MS = 1500
