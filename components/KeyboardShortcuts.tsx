'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { isAnyModalOpen } from '@/lib/useModal'
import { SEARCH_OVERLAY_EVENT } from '@/lib/searchOverlayBus'
import SearchOverlay from '@/components/SearchOverlay'

export default function KeyboardShortcuts() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl+K — a chord, so it fires even while typing.
      const isCmdK = (event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K') && !event.altKey
      // / — plain slash, ignored when a modifier is held so it can't be stolen
      // from some other shortcut.
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey
      if (!isCmdK && !isSlash) return

      // Escape belongs to the modal; don't open the overlay from under one. The
      // overlay itself registers with useModal, so once it's up this check is
      // already true — the local `open` guard covers the brief window before
      // that registration lands, preventing a double-open.
      if (isAnyModalOpen()) return
      if (open) return

      // / must stay typeable inside inputs and contenteditable regions.
      if (isSlash && isTypingTarget(event.target)) return

      event.preventDefault()
      setOpen(true)
    }

    // The same guards cover the bus event — a button elsewhere in the app asked
    // the overlay to open, but a modal would still block it (and the latch
    // stops a second copy stacking above the first).
    function handleSearchOverlayEvent() {
      if (isAnyModalOpen()) return
      if (open) return
      setOpen(true)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener(SEARCH_OVERLAY_EVENT, handleSearchOverlayEvent)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener(SEARCH_OVERLAY_EVENT, handleSearchOverlayEvent)
    }
  }, [open])

  // ?search=1 is how the retired /search route (and server-rendered links
  // that can't call openSearchOverlay) summon the overlay. Consume the param:
  // open, then strip it from the URL so refresh/back don't reopen.
  useEffect(() => {
    if (searchParams.get('search') !== '1') return
    // Opening on a param is the one intentional setState-in-effect; the effect
    // is keyed to searchParams so it re-runs exactly when the param appears.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isAnyModalOpen() && !open) setOpen(true)
    const params = new URLSearchParams(searchParams)
    params.delete('search')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return open ? <SearchOverlay onClose={() => setOpen(false)} /> : null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}
