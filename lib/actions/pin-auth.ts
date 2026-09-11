'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clearAdminSession, createAdminSession, verifyAdminPin } from '@/lib/pin-session'

export type LoginState = { error: string }

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

async function requestFingerprint() {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip') || 'unknown'
  const agent = h.get('user-agent') || 'unknown'
  return createHash('sha256').update(`${ip}|${agent}`).digest('hex')
}

export async function loginWithPin(_state: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '').trim()
  const fingerprint = await requestFingerprint()
  const supabase = await createClient()
  const now = new Date()

  const { data: row, error: readError } = await supabase
    .from('admin_pin_attempts')
    .select('attempt_count,window_started_at,blocked_until')
    .eq('fingerprint_hash', fingerprint)
    .maybeSingle()
  if (readError) throw new Error(readError.message)

  if (row?.blocked_until && new Date(row.blocked_until).getTime() > now.getTime()) {
    return { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' }
  }

  if (!verifyAdminPin(pin)) {
    const previousWindowStart = row?.window_started_at ? new Date(row.window_started_at).getTime() : 0
    const stillInWindow = now.getTime() - previousWindowStart < WINDOW_MS
    const nextCount = stillInWindow ? Number(row?.attempt_count || 0) + 1 : 1
    const blockedUntil = nextCount >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS).toISOString() : null

    const { error: writeError } = await supabase.from('admin_pin_attempts').upsert({
      fingerprint_hash: fingerprint,
      attempt_count: nextCount,
      window_started_at: stillInWindow && row?.window_started_at ? row.window_started_at : now.toISOString(),
      blocked_until: blockedUntil,
      updated_at: now.toISOString(),
    })
    if (writeError) throw new Error(writeError.message)

    await new Promise((resolve) => setTimeout(resolve, 450))
    return { error: blockedUntil ? 'Terlalu banyak percobaan. Akses dikunci sementara.' : 'PIN admin salah.' }
  }

  const { error: clearError } = await supabase
    .from('admin_pin_attempts')
    .delete()
    .eq('fingerprint_hash', fingerprint)
  if (clearError) throw new Error(clearError.message)

  await createAdminSession()
  redirect('/dashboard')
}

export async function logoutPinAdmin() {
  await clearAdminSession()
  redirect('/login')
}
