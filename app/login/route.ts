import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/pin-session'

function renderLogin(error = '') {
  const safeError = error
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Masuk Admin — Anwar Hafid Strategic Center</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f7fe;color:#1e293b}
    body{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(420px,100%);background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 20px 60px -35px rgba(15,23,42,.35)}
    .eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;color:#64748b}.card h1{margin:8px 0 6px}.card p{color:#64748b;line-height:1.55}
    form{display:grid;gap:14px;margin-top:20px}label{display:grid;gap:7px;font-size:12px;font-weight:800;color:#475569}input{width:100%;padding:13px 14px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a;outline:none;font-size:18px;letter-spacing:.2em}input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
    button{border:0;background:#0f172a;color:#fff;border-radius:12px;padding:13px 16px;font-weight:800;cursor:pointer}.error{padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-size:12px;border:1px solid #fecaca}.muted{font-size:12px;margin-bottom:0}
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">ANWAR HAFID STRATEGIC CENTER</p>
    <h1>Masuk Admin</h1>
    <p>Cukup masukkan PIN admin. Tidak ada username atau email.</p>
    <form method="post" action="/login" autocomplete="off">
      <label>PIN Admin
        <input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="current-password" placeholder="••••••" required autofocus />
      </label>
      ${safeError ? `<div class="error">${safeError}</div>` : ''}
      <button type="submit">Masuk</button>
    </form>
    <p class="muted">Sesi admin diproteksi cookie HTTP-only dan validasi server-side.</p>
  </main>
</body>
</html>`
}

export async function GET() {
  return new NextResponse(renderLogin(), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const pin = String(form.get('pin') ?? '').trim()
  if (!/^\d{6}$/.test(pin)) {
    return new NextResponse(renderLogin('PIN harus terdiri dari 6 angka.'), {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  const supabase = await createClient(null)
  const { data, error } = await supabase.rpc('ah_admin_login', { p_pin: pin })
  if (error) {
    console.error('PIN login RPC failed:', error.message)
    return new NextResponse(renderLogin('Login sedang bermasalah. Silakan coba lagi.'), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.success || !row.session_token) {
    const message = row?.error_code === 'rate_limited'
      ? 'Terlalu banyak percobaan. Akses dikunci sementara selama 15 menit.'
      : row?.error_code === 'configuration_missing'
        ? 'PIN admin belum dikonfigurasi.'
        : 'PIN admin salah.'
    return new NextResponse(renderLogin(message), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303)
  const expires = row.expires_at ? new Date(row.expires_at) : new Date(Date.now() + 12 * 60 * 60 * 1000)
  response.cookies.set(ADMIN_SESSION_COOKIE, row.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires,
    maxAge: Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000)),
  })
  return response
}
