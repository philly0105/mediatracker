'use client'
import { useSyncExternalStore, type CSSProperties } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { formatEyebrowDate, greetingFor, parseTimeKey, timeKey } from './greeting'

// The clock never needs a subscription; this is useSyncExternalStore for its
// server/client snapshot split only (the same trick as Kbd's useIsMac). The
// server does not know the reader's time zone, so it renders its own hour and
// the client corrects it in the hydration commit, with no mismatch warning and
// no flash of an empty heading.
const noSubscribe = () => () => {}
const clientKey = () => timeKey(new Date())

const H1: CSSProperties = {
  margin: '2px 0 0',
  fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
  letterSpacing: '-0.024em',
  color: 'var(--text-primary)',
}

export default function HomeGreeting({ name, serverKey }: { name: string | null; serverKey: string }) {
  const key = useSyncExternalStore(noSubscribe, clientKey, () => serverKey)
  const { date, hour } = parseTimeKey(key)
  const greeting = greetingFor(hour)

  return (
    <>
      <Eyebrow>{formatEyebrowDate(date)}</Eyebrow>
      {/* 30/36 from md up, the reference's 24/30 on phones. */}
      <h1
        className="text-[length:var(--text-2xl)] leading-[30px] md:text-[30px] md:leading-[36px]"
        style={H1}
      >
        {name ? `${greeting}, ${name}` : greeting}
      </h1>
    </>
  )
}
