import { ImageResponse } from 'next/og'

// iOS ignores the 32px icon and the manifest PNGs when a page is added to the
// home screen; without this it screenshots the page instead.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          fontSize: 116,
          fontWeight: 800,
        }}
      >
        D
      </div>
    ),
    { ...size }
  )
}
