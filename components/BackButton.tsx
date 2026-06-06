'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ label = 'Back', fallback = '/' }: { label?: string, fallback?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => {
        if (window.history.length > 2) {
          router.back()
        } else {
          router.push(fallback)
        }
      }}
      className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
