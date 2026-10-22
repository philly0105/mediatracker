import { ImageResponse } from 'next/og'

// The repo only carried the Next.js starter favicon.ico and two Vercel-triangle
// PNGs, so every tab and every installed-PWA icon was someone else's mark.
// Generating it here keeps the brand colours in one place rather than in a
// binary that drifts from the tokens.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// The same mark the sidebar wordmark draws: a light rounded square with the
// "D" and its counter cut out. The canvas around it is left transparent, so
// the favicon sits on whatever the tab strip is painted.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <rect x="0.5" y="0.5" width="31" height="31" rx="10" fill="#EAF6F9" />
          <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill="#08161C" />
          <circle cx="16.2" cy="16" r="2.6" fill="#EAF6F9" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
