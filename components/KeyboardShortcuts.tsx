'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAnyModalOpen } from '@/lib/useModal'

export default function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl+K — a chord, so it fires even while typing.
      const isCmdK = (event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K') && !event.altKey
      // / — plain slash, ignored when a modifier is held so it can't be stolen
      // from some other shortcut.
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey
      if (!isCmdK && !isSlash) return

      // Escape belongs to the modal; don't navigate out from under one.
      if (isAnyModalOpen()) return

      // / must stay typeable inside inputs and contenteditable regions.
      if (isSlash && isTypingTarget(event.target)) return

      event.preventDefault()
      router.push('/search')
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}