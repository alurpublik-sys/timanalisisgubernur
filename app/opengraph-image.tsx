import { ImageResponse } from 'next/og'
import { APP_NAME, GOVERNOR_PHOTO, VICE_GOVERNOR_PHOTO } from '@/lib/branding'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const modules = [
  ['Kunjungan OPD', 'Notulensi & dokumen'],
  ['Media Monitor', 'Pantauan media'],
  ['9 BERANI', 'Data program unggulan'],
  ['Temuan OPD', 'Catatan lintas OPD'],
  ['Referensi Konten', 'Bahan komunikasi'],
  ['Tim Analisis', 'Direktori tim'],
]

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width:'100%', height:'100%', display:'flex', background:'#eef3f7', fontFamily:'sans-serif', color:'#16334d', padding:24 }}>
      <div style={{ width:'100%', height:'100%', display:'flex', borderRadius:28, overflow:'hidden', background:'#fff', border:'1px solid #dce5ec', boxShadow:'0 24px 70px rgba(19,55,84,.16)' }}>
        <div style={{ width:188, background:'linear-gradient(180deg,#071a30,#0b2d4d)', color:'#fff', padding:'28px 20px', display:'flex', flexDirection:'column' }}>
          <div style={{ width:52, height:52, borderRadius:16, border:'2px solid #d6b44a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:900 }}>9</div>
          <div style={{ marginTop:14, fontSize:14, fontWeight:800, lineHeight:1.2 }}>Tim Analisis Strategis</div>
          <div style={{ marginTop:4, fontSize:8, color:'#9fb6ca' }}>Komunikasi Strategis · Independen</div>
          <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:9 }}>
            {['Dashboard','Kunjungan OPD','Media Monitor','9 BERANI','Temuan OPD','Referensi Konten'].map((label,index)=>(
              <div key={label} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:11, background:index===0?'rgba(255,255,255,.12)':'transparent', color:index===0?'#fff':'#a9bfd2', fontSize:9, fontWeight:700 }}>
                <div style={{ width:22, height:22, borderRadius:7, border:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:6 }}>{String(index+1).padStart(2,'0')}</div>
                {label}
              </div>
            ))}
          </div>
          <div style={{ marginTop:'auto', paddingTop:18, borderTop:'1px solid rgba(255,255,255,.1)', fontSize:8, color:'#8ca8bf' }}>Data · Analisis · Informasi</div>
        </div>

        <div style={{ flex:1, padding:'24px 26px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:7, fontWeight:900, letterSpacing:2, color:'#7a8fa1' }}>TIM ANALISIS DAN KOMUNIKASI STRATEGIS (INDEPENDEN)</div>
              <div style={{ marginTop:4, fontSize:24, fontWeight:900, letterSpacing:-1 }}>Dashboard Strategis</div>
            </div>
            <div style={{ padding:'8px 11px', border:'1px solid #dce6ed', borderRadius:11, fontSize:8, color:'#648096' }}>● Sistem Aktif</div>
          </div>

          <div style={{ height:238, display:'flex', borderRadius:22, overflow:'hidden', background:'linear-gradient(130deg,#07182b,#0d2944 58%,#123d63)', color:'#fff', position:'relative' }}>
            <div style={{ width:'57%', padding:'28px 26px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ fontSize:7, fontWeight:900, letterSpacing:2, color:'#9fbbd3' }}>INDEPENDENT STRATEGIC ANALYSIS</div>
              <div style={{ marginTop:10, fontSize:28, lineHeight:1.12, fontWeight:900, letterSpacing:-1 }}>{APP_NAME}</div>
              <div style={{ marginTop:11, fontSize:10, lineHeight:1.55, color:'#c3d2df', maxWidth:470 }}>Kunjungan OPD, media monitoring, data 9 BERANI, temuan lapangan, dan referensi informasi dalam satu ruang kerja.</div>
              <div style={{ display:'flex', gap:8, marginTop:15 }}>
                <div style={{ padding:'8px 12px', borderRadius:10, background:'#fff', color:'#17344d', fontSize:8, fontWeight:800 }}>Buka 9 BERANI</div>
                <div style={{ padding:'8px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,.18)', fontSize:8, fontWeight:800 }}>Referensi Konten</div>
              </div>
            </div>
            <div style={{ width:'43%', position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
              <img src={GOVERNOR_PHOTO} width={205} height={225} style={{ objectFit:'contain', objectPosition:'bottom', position:'absolute', left:6, bottom:-2 }} />
              <img src={VICE_GOVERNOR_PHOTO} width={192} height={216} style={{ objectFit:'contain', objectPosition:'bottom', position:'absolute', right:-2, bottom:-2 }} />
            </div>
          </div>

          <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
            {modules.map(([label,note])=>(
              <div key={label} style={{ width:153, minHeight:82, padding:'12px 12px', border:'1px solid #e0e8ee', borderRadius:14, background:'#fbfcfd', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:9, fontWeight:800, color:'#587087' }}>{label}</div>
                <div style={{ fontSize:7, lineHeight:1.35, color:'#93a1ad' }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    size,
  )
}
