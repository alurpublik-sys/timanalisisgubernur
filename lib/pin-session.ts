import 'server-only'
import { cookies } from 'next/headers'

export const ADMIN_SESSION_COOKIE = 'ah_admin_session'
const SESSION_SECONDS = 12 * 60 * 60

export async function getAdminSessionToken() {
  const store = await cookies()
  return store.get(ADMIN_SESSION_COOKIE)?.value || null
}

export async function hasAdminSessionCookie() {
  return !!(await getAdminSessionToken())
}

export async function createAdminSession(token: string, expiresAt?: string | null) {
  if (!token || token.length < 32) throw new Error('Token sesi admin tidak valid.')
  const store = await cookies()
  const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + SESSION_SECONDS * 1000)
  const maxAge = Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000))

  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
    expires,
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
