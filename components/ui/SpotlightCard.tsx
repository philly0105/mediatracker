'use client'

import React, { useRef, useState } from 'react'

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.08)',
}: {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-[24px] bg-[#0a0a0c]/80 border border-white/5 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)] ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
