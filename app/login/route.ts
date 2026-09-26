import { NextResponse } from 'next/server'
import { APP_NAME, GOVERNOR_PHOTO } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/pin-session'

function escapeHtml(value = '') {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/pengaturan'
  const allowed = ['/pengaturan','/referensi-konten','/temuan-opd','/berani','/kunjungan','/media-monitor','/tim-analisis','/dashboard']
  return allowed.some((path) => value === path || value.startsWith(path + '/')) ? value : '/pengaturan'
}

function renderLogin(error = '', pinChanged = false, next = '/pengaturan') {
  const safeError = escapeHtml(error)
  const safeReturn = escapeHtml(next)
  const title = escapeHtml(APP_NAME)
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/><title>Mode Edit — ${title}</title><style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eef3f8;color:#102033}
body{min-height:100vh;display:grid;place-items:center;padding:24px;background-image:radial-gradient(circle at 8% 8%,rgba(35,91,139,.16),transparent 33%),radial-gradient(circle at 96% 92%,rgba(10,39,67,.1),transparent 35%)}
.wrap{width:min(920px,100%);display:grid;grid-template-columns:.9fr 1.1fr;background:#fff;border:1px solid #dde6ee;border-radius:30px;overflow:hidden;box-shadow:0 36px 95px -48px rgba(7,24,43,.42)}
.visual{position:relative;min-height:500px;background:linear-gradient(150deg,#06192d,#0d3153);overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.visual:before,.visual:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.1)}.visual:before{width:360px;height:360px;top:54px;right:-60px}.visual:after{width:250px;height:250px;top:108px;right:-5px}
.visual img{position:relative;z-index:2;width:90%;height:470px;object-fit:contain;object-position:bottom;filter:drop-shadow(0 24px 32px rgba(0,0,0,.3))}
.visual-label{position:absolute;z-index:3;left:22px;right:22px;bottom:20px;padding:14px 16px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(6,25,45,.7);backdrop-filter:blur(14px);color:#fff}
.visual-label b{display:block;font-size:13px}.visual-label span{display:block;margin-top:3px;font-size:10px;color:#b9cad8}
.card{padding:44px 42px;display:flex;flex-direction:column;justify-content:center}.eyebrow{margin:0;font-size:9px;font-weight:900;letter-spacing:.16em;color:#668097}.card h1{margin:10px 0 10px;font-size:34px;letter-spacing:-.045em}.card>p{color:#607386;line-height:1.65;margin:0}
form{display:grid;gap:13px;margin-top:22px}label{display:grid;gap:8px;font-size:11px;font-weight:850;color:#42566a}input{width:100%;padding:14px 15px;border:1px solid #cbd8e3;border-radius:14px;background:#fff;color:#0f172a;outline:none;font-size:18px;letter-spacing:.18em}input:focus{border-color:#315f8b;box-shadow:0 0 0 4px rgba(49,95,139,.1)}
button{border:0;background:#0a2743;color:#fff;border-radius:14px;padding:14px 16px;font-weight:850;cursor:pointer}.error,.success{padding:11px 13px;border-radius:12px;font-size:11px}.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}.success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}.back{display:inline-flex;margin-top:16px;color:#315f8b;font-size:11px;font-weight:800;text-decoration:none}.muted{font-size:10px!important;margin-top:14px!important;color:#8292a0!important}
@media(max-width:760px){body{padding:12px}.wrap{grid-template-columns:1fr;border-radius:24px}.visual{min-height:220px}.visual img{height:245px;width:auto}.visual-label{left:14px;right:14px;bottom:12px}.card{padding:28px 22px}.card h1{font-size:28px}}
</style></head><body><main class="wrap"><section class="visual"><img src="${GOVERNOR_PHOTO}" alt=""/><div class="visual-label"><b>${title}</b><span>Mode edit administrator</span></div></section><section class="card"><p class="eyebrow">AKSES TERLINDUNGI</p><h1>Masukkan PIN Admin</h1><p>Setelah PIN benar, sesi edit aktif selama 12 jam untuk fitur yang dilindungi.</p><form method="post" action="/login" autocomplete="off"><input type="hidden" name="next" value="${safeReturn}"/><label>PIN Administrator<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" autocomplete="current-password" placeholder="•••••••" required autofocus/></label>${pinChanged?'<div class="success">PIN berhasil diganti. Masuk kembali dengan PIN baru.</div>':''}${safeError?`<div class="error">${safeError}</div>`:''}<button type="submit">Aktifkan Mode Edit</button></form><a class="back" href="/dashboard">← Kembali ke Dashboard</a><p class="muted">Sesi disimpan dalam cookie HTTP-only dan divalidasi server-side.</p></section></main></body></html>`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get('next'))
  const pinChanged = url.searchParams.get('pin_changed') === '1'
  return new NextResponse(renderLogin('', pinChanged, next), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' } })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const pin = String(form.get('pin') ?? '').trim()
  const next = safeNext(String(form.get('next') ?? '/pengaturan'))
  if (!/^\d{6,8}$/.test(pin)) return new NextResponse(renderLogin('PIN harus terdiri dari 6 sampai 8 angka.', false, next), { status: 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })

  const supabase = await createClient(null)
  const { data, error } = await supabase.rpc('ah_admin_login', { p_pin: pin })
  if (error) {
    console.error('PIN login RPC failed:', error.message)
    return new NextResponse(renderLogin('Akses admin sedang bermasalah. Silakan coba lagi.', false, next), { status: 500, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.success || !row.session_token) {
    const message = row?.error_code === 'rate_limited' ? 'Terlalu banyak percobaan. Akses dikunci sementara selama 15 menit.' : row?.error_code === 'configuration_missing' ? 'PIN administrator belum dikonfigurasi.' : 'PIN salah.'
    return new NextResponse(renderLogin(message, false, next), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303)
  const expires = row.expires_at ? new Date(row.expires_at) : new Date(Date.now() + 12 * 60 * 60 * 1000)
  response.cookies.set(ADMIN_SESSION_COOKIE, row.session_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires, maxAge: Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000)) })
  return response
}
