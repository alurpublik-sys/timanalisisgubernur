import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 38, background: 'linear-gradient(135deg,#081f3e,#0e4d8f)', color: 'white',
      border: '8px solid #dfb442', fontFamily: 'sans-serif', fontWeight: 900, position: 'relative'
    }}>
      <div style={{ fontSize: 108, lineHeight: 1 }}>9</div>
      <div style={{ position: 'absolute', bottom: 17, fontSize: 20, letterSpacing: 4 }}>TKS</div>
    </div>,
    size,
  )
}
