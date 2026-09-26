import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 40, background: 'linear-gradient(145deg,#071A30,#0A2D4E 58%,#0E446E)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: 34,
        border: '1px solid rgba(255,255,255,.12)'
      }} />
      <div style={{ position: 'absolute', width: 96, height: 20, borderRadius: 12, background: '#F7FAFC', top: 50 }} />
      <div style={{ position: 'absolute', width: 20, height: 74, borderRadius: 12, background: '#F7FAFC', top: 50 }} />
      <div style={{
        position: 'absolute', width: 104, height: 18, borderRadius: 12,
        background: 'linear-gradient(90deg,#C99422,#E4B94C,#F5D77D)',
        transform: 'rotate(-24deg)', left: 54, top: 105
      }} />
      <div style={{ position: 'absolute', width: 12, height: 12, borderRadius: 999, background: '#F5D77D', left: 49, top: 121 }} />
      <div style={{ position: 'absolute', width: 12, height: 12, borderRadius: 999, background: '#F5D77D', right: 19, top: 76 }} />
    </div>,
    size,
  )
}
