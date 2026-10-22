import { ImageResponse } from 'next/og'

// iOS ignores the 32px icon and the manifest PNGs when a page is added to the
// home screen; without this it screenshots the page instead.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// The sidebar mark, bled to the edges: iOS applies its own corner mask to a
// home-screen icon, so a rounded square drawn inside a canvas would show dark
// wedges in the corners. The glyph geometry is the same 32-unit grid.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#EAF6F9' }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill="#08161C" />
          <circle cx="16.2" cy="16" r="2.6" fill="#EAF6F9" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
