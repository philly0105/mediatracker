'use client'
import { Presence, type PresenceChild } from '@/components/Presence'
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
  // Only the help sheet animates out; the ⌘K overlay is always replaced by
  // whatever it opened, so it has never had an exit to play.
  const help: PresenceChild[] = helpOpen
    ? [{
        key: 'help',
        render: (exiting) => <KeyboardHelp onClose={onCloseHelp} exiting={exiting} />,
      }]
    : []

  return (
    <>
      {searchOpen && <SearchOverlay onClose={onCloseSearch} />}
      <Presence>{help}</Presence>
    </>
  )
}
