'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { isAnyModalOpen } from '@/lib/useModal'
import { SEARCH_OVERLAY_EVENT } from '@/lib/searchOverlayBus'
import { QUICK_NAV, G_CHORD_MS } from '@/lib/quickNav'

const KeyboardShortcutPanels = dynamic(() => import('@/components/KeyboardShortcutPanels'))

export default function KeyboardShortcuts() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [panelsLoaded, setPanelsLoaded] = useState(false)
  const searchParamTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When `g` was last pressed. A chord rather than a modifier, so it has to
  // expire — otherwise a `g` typed and abandoned turns the next `l` into a
  // navigation an hour later.
  const gPressedAt = useRef(0)

  useEffect(() => () => {
    if (searchParamTimer.current !== null) {
      clearTimeout(searchParamTimer.current)
      searchParamTimer.current = null
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const typing = isTypingTarget(event.target)
      const plain = !event.metaKey && !event.ctrlKey && !event.altKey

      // g-prefixed jumps. Second key first, so a pending `g` is consumed even
      // if the follow-up is also a shortcut letter.
      if (plain && !typing && !isAnyModalOpen() && !open) {
        if (Date.now() - gPressedAt.current < G_CHORD_MS) {
          const target = QUICK_NAV.find((item) => item.key === event.key.toLowerCase())
          gPressedAt.current = 0
          if (target) {
            event.preventDefault()
            router.push(target.href)
            return
          }
        }
        if (event.key === 'g') {
          gPressedAt.current = Date.now()
          return
        }
        gPressedAt.current = 0

        // ? is Shift+/ on most layouts, so it has to be checked before the
        // bare-slash branch below claims it.
        if (event.key === '?') {
          event.preventDefault()
          // Open only. The branch is already gated on !isAnyModalOpen(), and the
          // sheet registers as a modal, so a second ? never reaches this — it
          // closes with Escape or the close button, like every other dialog.
          setPanelsLoaded(true)
          setHelpOpen(true)
          return
        }
      }

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
      if (isSlash && typing) return

      event.preventDefault()
      setPanelsLoaded(true)
      setOpen(true)
    }

    // The same guards cover the bus event — a button elsewhere in the app asked
    // the overlay to open, but a modal would still block it (and the latch
    // stops a second copy stacking above the first).
    function handleSearchOverlayEvent() {
      if (isAnyModalOpen()) return
      if (open) return
      setPanelsLoaded(true)
      setOpen(true)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener(SEARCH_OVERLAY_EVENT, handleSearchOverlayEvent)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener(SEARCH_OVERLAY_EVENT, handleSearchOverlayEvent)
    }
  }, [open, router])

  // ?search=1 is how the retired /search route (and server-rendered links
  // that can't call openSearchOverlay) summon the overlay. Consume the param:
  // open, then strip it from the URL so refresh/back don't reopen.
  useEffect(() => {
    if (searchParams.get('search') !== '1') return

    // Let sibling modal effects register before reusing the overlay's event
    // boundary. URL replacement may rerender this effect, so the timer is owned
    // by an unmount-only cleanup above rather than cancelled by param changes.
    if (searchParamTimer.current === null) {
      searchParamTimer.current = setTimeout(() => {
        searchParamTimer.current = null
        window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT))
      }, 0)
    }

    const params = new URLSearchParams(searchParams)
    params.delete('search')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })

  }, [pathname, router, searchParams])

  return (
    <>
      {panelsLoaded && (
        <KeyboardShortcutPanels
          searchOpen={open}
          helpOpen={helpOpen}
          onCloseSearch={() => setOpen(false)}
          onCloseHelp={() => setHelpOpen(false)}
        />
      )}
    </>
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}
