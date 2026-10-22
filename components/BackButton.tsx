'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// A secondary glass pill rather than a bare text link, so it reads as a
// control over the ambient art and clears the 44px target.
export default function BackButton({ label = 'Back', fallback = '/' }: { label?: string, fallback?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        if (window.history.length > 2) {
          router.back()
        } else {
          router.push(fallback)
        }
      }}
    >
      <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
      {label}
    </Button>
  )
}
