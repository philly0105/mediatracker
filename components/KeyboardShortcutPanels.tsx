'use client'
import { AnimatePresence } from 'framer-motion'
import SearchOverlay from '@/components/SearchOverlay'
import KeyboardHelp from '@/components/KeyboardHelp'

export interface KeyboardShortcutPanelsProps {
  searchOpen: boolean
  helpOpen: boolean
  onCloseSearch: () => void
  onCloseHelp: () => void
}

export default function KeyboardShortcutPanels({
  searchOpen,
  helpOpen,
  onCloseSearch,
  onCloseHelp,
}: KeyboardShortcutPanelsProps) {
  return (
    <>
      {searchOpen && <SearchOverlay onClose={onCloseSearch} />}
      <AnimatePresence>
        {helpOpen && <KeyboardHelp onClose={onCloseHelp} />}
      </AnimatePresence>
    </>
  )
}
