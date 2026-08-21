import { ImageResponse } from 'next/og'

// The repo only carried the Next.js starter favicon.ico and two Vercel-triangle
// PNGs, so every tab and every installed-PWA icon was someone else's mark.
// Generating it here keeps the brand colours in one place rather than in a
// binary that drifts from the tokens.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#100e09',
          color: '#7c9a6a',
          fontSize: 24,
          fontWeight: 800,
          borderRadius: 6,
        }}
      >
        D
      </div>
    ),
    { ...size }
  )
}
