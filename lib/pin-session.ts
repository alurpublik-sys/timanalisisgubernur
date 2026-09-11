import 'server-only'
import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_SESSION_COOKIE = 'ah_admin_session'
const SESSION_SECONDS = 12 * 60 * 60

function requireSessionSecret() {
  const secret = process.env.AH_SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('AH_SESSION_SECRET wajib diisi minimal 32 karakter.')
  return secret
}

function requireAdminPin() {
  const pin = process.env.ADMIN_PIN
  if (!pin) throw new Error('ADMIN_PIN belum dikonfigurasi di server.')
  return pin
}

function pinFingerprint() {
  return createHash('sha256').update(requireAdminPin()).digest('hex')
}

function sessionSignature(expiresAt: number) {
  return createHmac('sha256', requireSessionSecret())
    .update(`ah-admin:${expiresAt}:${pinFingerprint()}`)
    .digest('hex')
}

export function verifyAdminPin(input: string) {
  const expected = requireAdminPin()
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function verifySessionValue(value?: string | null) {
  if (!value) return false
  const [expiresRaw, signature] = value.split('.')
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) return false
  const expected = sessionSignature(expiresAt)
  const a = Buffer.from(signature, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function hasAdminSession() {
  const store = await cookies()
  return verifySessionValue(store.get(ADMIN_SESSION_COOKIE)?.value)
}

export async function createAdminSession() {
  const store = await cookies()
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  store.set(ADMIN_SESSION_COOKIE, `${expiresAt}.${sessionSignature(expiresAt)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}
