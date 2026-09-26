import { ImageResponse } from 'next/og'
import { APP_NAME, APP_TAGLINE, GOVERNOR_PHOTO, VICE_GOVERNOR_PHOTO } from '@/lib/branding'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg,#071d38 0%,#0d416f 58%,#eaf4fb 58%,#f8fbfd 100%)',
      fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ width: '62%', padding: '68px 60px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, letterSpacing: 4, color: '#f0cd64', fontWeight: 800, marginBottom: 18 }}>SULAWESI TENGAH</div>
        <div style={{ fontSize: 54, lineHeight: 1.08, fontWeight: 900, letterSpacing: -2 }}>{APP_NAME}</div>
        <div style={{ fontSize: 24, marginTop: 24, color: '#c9dbea' }}>{APP_TAGLINE}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 34 }}>
          {['9 BERANI','Kunjungan OPD','Temuan OPD','Referensi Konten'].map((label) => (
            <div key={label} style={{ padding: '10px 15px', borderRadius: 999, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', fontSize: 15 }}>{label}</div>
          ))}
        </div>
      </div>
      <div style={{ width: '38%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <img src={GOVERNOR_PHOTO} width="265" height="500" style={{ objectFit: 'contain', objectPosition: 'bottom', position: 'absolute', left: 0, bottom: -5 }} />
        <img src={VICE_GOVERNOR_PHOTO} width="250" height="485" style={{ objectFit: 'contain', objectPosition: 'bottom', position: 'absolute', right: -8, bottom: -5 }} />
      </div>
      <div style={{ position: 'absolute', left: 60, bottom: 34, width: 540, height: 5, borderRadius: 3, background: 'linear-gradient(90deg,#d9ad38,#fff0a5,transparent)' }} />
    </div>,
    size,
  )
}
