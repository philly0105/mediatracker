'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — Import/Export now lives under Settings. */
export default function ImportPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings#import-export')
  }, [router])

  return null
}
