import { createClient } from '@/lib/supabase/server'

const DEFAULT_SETTINGS: Record<string, number> = {
  HONOR_DASAR: 3500000,
  POTONGAN_75_84: 350000,
  POTONGAN_65_74: 700000,
  POTONGAN_50_64: 1050000,
  POTONGAN_35_49: 1400000,
  POTONGAN_20_34: 1750000,
  POTONGAN_0_19: 2100000,
  FAKTOR_HADIR: 1,
  FAKTOR_IZIN: 0.5,
  FAKTOR_TIDAK_HADIR: 0,
  MIN_AGENDA_INTI_FLOOR: 3,
}

export function currentPeriod() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Makassar', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return `${year}-${month}`
}

export function normalizePeriod(input?: string | null) {
  const value = String(input || '').trim()
  return /^\d{4}-\d{2}$/.test(value) ? value : currentPeriod()
}

function nextPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  const next = month === 12 ? [year + 1, 1] : [year, month + 1]
  return `${next[0]}-${String(next[1]).padStart(2, '0')}`
}

function splitRules(text?: string | null) {
  return String(text || '').split(/[,;|\n]+/).map((v) => v.trim().toLowerCase()).filter(Boolean)
}

function memberMatches(member: any, ruleText?: string | null) {
  const rules = splitRules(ruleText)
  const code = String(member.kode || '').trim().toLowerCase()
  const name = String(member.nama || '').trim().toLowerCase()
  return rules.some((rule) => rule === code || rule === name)
}

export function isMemberExcluded(member: any, agendaMaster: any) {
  return !!agendaMaster && memberMatches(member, agendaMaster.pengecualian)
}

export function isContributionAllowed(member: any, contributionMaster: any) {
  if (!contributionMaster) return false
  if (!String(contributionMaster.khusus_tim || '').trim()) return true
  return memberMatches(member, contributionMaster.khusus_tim)
}

function attendanceFactor(status: string, settings: Record<string, number>) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'hadir') return Number(settings.FAKTOR_HADIR ?? 1)
  if (value === 'izin') return Number(settings.FAKTOR_IZIN ?? 0.5)
  return Number(settings.FAKTOR_TIDAK_HADIR ?? 0)
}

function honorRecommendation(rateValue: number | null, requiredAgendaCount: number, settings: Record<string, number>) {
  const honor = Number(settings.HONOR_DASAR ?? 3500000)
  if (!requiredAgendaCount) return { deduction: 0, recommendedHonor: honor, label: 'Belum ada agenda wajib', severity: 'neutral' }
  const rate = Number(rateValue || 0)
  let deduction = 0
  let label = 'Honor penuh'
  let severity = 'good'
  if (rate >= 85) {
    deduction = 0
  } else if (rate >= 75) {
    deduction = Number(settings.POTONGAN_75_84 ?? 350000); label = 'Perlu perhatian'; severity = 'light'
  } else if (rate >= 65) {
    deduction = Number(settings.POTONGAN_65_74 ?? 700000); label = 'Kinerja kurang'; severity = 'medium'
  } else if (rate >= 50) {
    deduction = Number(settings.POTONGAN_50_64 ?? 1050000); label = 'Perlu evaluasi'; severity = 'medium'
  } else if (rate >= 35) {
    deduction = Number(settings.POTONGAN_35_49 ?? 1400000); label = 'Evaluasi serius'; severity = 'high'
  } else if (rate >= 20) {
    deduction = Number(settings.POTONGAN_20_34 ?? 1750000); label = 'Kinerja sangat rendah'; severity = 'critical'
  } else {
    deduction = Number(settings.POTONGAN_0_19 ?? 2100000); label = 'Tidak memenuhi kewajiban'; severity = 'critical'
  }
  deduction = Math.min(Math.max(deduction, 0), honor)
  return { deduction, recommendedHonor: Math.max(honor - deduction, 0), label, severity }
}

function groupAttendanceEvents(rows: any[]) {
  const groups = new Map<string, any>()
  for (const row of rows || []) {
    const key = row.agenda_event_id || row.kode
    if (!groups.has(key)) groups.set(key, { id: key, date: row.tanggal, agendaType: row.jenis_agenda, detail: row.detail_agenda, location: row.lokasi, members: [] })
    groups.get(key).members.push(row)
  }
  return [...groups.values()]
}

function buildEvaluations(team: any[], attendanceRows: any[], contributions: any[], agendaMasters: any[], contributionMasters: any[], settings: Record<string, number>) {
  const events = groupAttendanceEvents(attendanceRows)
  const agendaByName = new Map(agendaMasters.map((v: any) => [String(v.nama_agenda).trim().toLowerCase(), v]))
  const contributionByName = new Map(contributionMasters.map((v: any) => [String(v.nama_kontribusi).trim().toLowerCase(), v]))

  return team.map((member: any) => {
    let possibleWeight = 0, earnedWeight = 0, requiredAgendaCount = 0, hadir = 0, izin = 0, tidakHadir = 0
    let opdRequired = 0, opdHadir = 0, opdEarnedUnits = 0, rapatRequired = 0, rapatHadir = 0, rapatEarnedUnits = 0

    for (const event of events) {
      const master: any = agendaByName.get(String(event.agendaType || '').trim().toLowerCase()) || { nama_agenda: event.agendaType, bobot: 1, kewajiban: 'Peserta Dipilih', pengecualian: '' }
      if (isMemberExcluded(member, master)) continue
      const memberRow = event.members.find((row: any) => Number(row.tim_id) === Number(member.id) || (!row.tim_id && String(row.nama_anggota || '').trim().toLowerCase() === String(member.nama || '').trim().toLowerCase()))
      const isAllTeam = String(master.kewajiban || '').trim().toLowerCase() === 'semua tim'
      if (!isAllTeam && !memberRow) continue

      const weight = memberRow && Number(memberRow.bobot_agenda) > 0 ? Number(memberRow.bobot_agenda) : Number(master.bobot || 1)
      const status = memberRow ? String(memberRow.status_kehadiran || '').trim() : 'Tidak Hadir'
      const factor = attendanceFactor(status, settings)
      requiredAgendaCount += 1; possibleWeight += weight; earnedWeight += weight * factor
      if (status === 'Hadir') hadir += 1; else if (status === 'Izin') izin += 1; else tidakHadir += 1

      const agendaLower = String(event.agendaType || '').trim().toLowerCase()
      if (agendaLower === 'kunjungan opd') { opdRequired += 1; opdEarnedUnits += factor; if (status === 'Hadir') opdHadir += 1 }
      if (agendaLower === 'rapat internal') { rapatRequired += 1; rapatEarnedUnits += factor; if (status === 'Hadir') rapatHadir += 1 }
    }

    const attendanceRate = possibleWeight > 0 ? Math.round((earnedWeight / possibleWeight) * 100) : null
    const memberContributions = contributions.filter((row: any) => Number(row.tim_id) === Number(member.id) || (!row.tim_id && String(row.nama_anggota || '').trim().toLowerCase() === String(member.nama || '').trim().toLowerCase()))
    let contributionPoints = 0, completedContributions = 0
    for (const row of memberContributions) {
      if (String(row.status || '').trim().toLowerCase() !== 'selesai') continue
      completedContributions += 1
      const master: any = contributionByName.get(String(row.jenis_kontribusi || '').trim().toLowerCase())
      contributionPoints += Number(row.bobot) > 0 ? Number(row.bobot) : Number(master?.bobot || 1)
    }

    const opdRate = opdRequired > 0 ? Math.round((opdEarnedUnits / opdRequired) * 100) : null
    const rapatRate = rapatRequired > 0 ? Math.round((rapatEarnedUnits / rapatRequired) * 100) : null
    let honorEvaluationRate = attendanceRate
    let honorBasis = 'Kehadiran Wajib'
    const minCoreAgenda = Math.max(1, Number(settings.MIN_AGENDA_INTI_FLOOR ?? 3))
    if (opdRequired >= minCoreAgenda && (honorEvaluationRate === null || Number(opdRate) < honorEvaluationRate)) { honorEvaluationRate = opdRate; honorBasis = 'Kunjungan OPD' }
    if (rapatRequired >= minCoreAgenda && (honorEvaluationRate === null || Number(rapatRate) < honorEvaluationRate)) { honorEvaluationRate = rapatRate; honorBasis = 'Rapat Internal' }
    const honor = honorRecommendation(honorEvaluationRate, requiredAgendaCount, settings)
    const opdMaster: any = agendaByName.get('kunjungan opd')

    return {
      dbId: member.id, ID_TIM: member.kode, NAMA: member.nama, PERAN: member.peran,
      requiredAgendaCount, hadir, izin, tidakHadir, possibleWeight, earnedWeight: Math.round(earnedWeight * 100) / 100,
      attendanceRate, opdExcluded: !!opdMaster && isMemberExcluded(member, opdMaster), opdRequired, opdHadir, opdRate,
      rapatRequired, rapatHadir, rapatRate, honorEvaluationRate, honorBasis,
      totalContributions: memberContributions.length, completedContributions, contributionPoints,
      honorBase: Number(settings.HONOR_DASAR ?? 3500000), recommendedDeduction: honor.deduction,
      recommendedHonor: honor.recommendedHonor, recommendationLabel: honor.label, recommendationSeverity: honor.severity,
    }
  })
}

function snapshotToEvaluation(row: any) {
  return {
    dbId: row.tim_id, ID_TIM: row.tim_analisis?.kode || '', NAMA: row.nama_anggota, PERAN: row.peran,
    requiredAgendaCount: Number(row.required_agenda || 0), hadir: Number(row.hadir || 0), izin: Number(row.izin || 0), tidakHadir: Number(row.tidak_hadir || 0),
    attendanceRate: row.kehadiran_wajib_pct === null ? null : Number(row.kehadiran_wajib_pct), opdExcluded: !!row.opd_excluded,
    opdRequired: Number(row.opd_required || 0), opdHadir: Number(row.opd_hadir || 0), opdRate: row.opd_pct === null ? null : Number(row.opd_pct),
    rapatRequired: Number(row.rapat_required || 0), rapatHadir: Number(row.rapat_hadir || 0), rapatRate: row.rapat_pct === null ? null : Number(row.rapat_pct),
    totalContributions: Number(row.total_kontribusi || 0), completedContributions: Number(row.output_selesai || 0), contributionPoints: Number(row.poin_kontribusi || 0),
    honorBasis: row.basis_evaluasi || 'Kehadiran Wajib', honorEvaluationRate: row.nilai_evaluasi_pct === null ? null : Number(row.nilai_evaluasi_pct),
    recommendedDeduction: Number(row.rekomendasi_potongan || 0), recommendedHonor: Number(row.honor_direkomendasikan || 0),
    recommendationLabel: row.label_rekomendasi || '', recommendationSeverity: Number(row.rekomendasi_potongan || 0) > 0 ? 'critical' : 'good',
  }
}

function hideHonor(evaluations: any[]) {
  return evaluations.map((item) => ({ ...item, honorBasis: '', honorEvaluationRate: null, recommendedDeduction: null, recommendedHonor: null, recommendationLabel: '', recommendationSeverity: '' }))
}

function buildSummary(evaluations: any[], contributions: any[], attendanceRows: any[]) {
  const valid = evaluations.filter((item) => item.requiredAgendaCount > 0 && item.attendanceRate !== null)
  const completed = contributions.filter((row) => String(row.status || '').trim().toLowerCase() === 'selesai').length
  return {
    totalAgenda: groupAttendanceEvents(attendanceRows).length,
    attendanceRate: valid.length ? Math.round(valid.reduce((sum, item) => sum + Number(item.attendanceRate || 0), 0) / valid.length) : 0,
    totalContributions: contributions.length, completedContributions: completed, inProgressContributions: Math.max(contributions.length - completed, 0),
    totalRecommendedDeduction: evaluations.reduce((sum, item) => sum + Number(item.recommendedDeduction || 0), 0),
    totalRecommendedHonor: evaluations.reduce((sum, item) => sum + Number(item.recommendedHonor || 0), 0),
  }
}

export async function getKinerjaData(periodInput?: string | null) {
  const period = normalizePeriod(periodInput)
  const start = `${period}-01`
  const end = `${nextPeriod(period)}-01`
  const supabase = await createClient()
  const [teamRes, agendaRes, contributionMasterRes, settingsRes, attendanceRes, contributionRes, finalRes] = await Promise.all([
    supabase.from('tim_analisis').select('*').eq('active', true).order('id'),
    supabase.from('master_agenda').select('*').eq('status', 'Aktif').order('id'),
    supabase.from('master_kontribusi').select('*').eq('status', 'Aktif').order('id'),
    supabase.from('pengaturan_kinerja').select('*'),
    supabase.from('absensi_agenda').select('*').gte('tanggal', start).lt('tanggal', end).order('tanggal', { ascending: false }),
    supabase.from('kontribusi_kerja').select('*').gte('tanggal', start).lt('tanggal', end).order('tanggal', { ascending: false }),
    supabase.from('finalisasi_honor').select('*, tim_analisis(kode)').eq('periode', period).order('finalized_at', { ascending: false }),
  ])
  for (const result of [teamRes, agendaRes, contributionMasterRes, settingsRes, attendanceRes, contributionRes, finalRes]) if (result.error) throw new Error(result.error.message)

  const team = teamRes.data || [], agendaMasters = agendaRes.data || [], contributionMasters = contributionMasterRes.data || []
  const attendance = attendanceRes.data || [], contributions = contributionRes.data || [], finalRows = finalRes.data || []
  const settings = { ...DEFAULT_SETTINGS }
  for (const row of settingsRes.data || []) settings[row.kunci] = Number(row.nilai)

  const selectedCurrent = currentPeriod()
  const isPast = period < selectedCurrent
  const periodState = period < selectedCurrent ? 'past' : period > selectedCurrent ? 'future' : 'current'
  const activeFinal = isPast ? finalRows.find((row: any) => String(row.status || '').toUpperCase() === 'FINAL') : undefined
  const finalizationId = activeFinal?.finalization_id || ''
  const activeRows = finalizationId ? finalRows.filter((row: any) => row.finalization_id === finalizationId && String(row.status || '').toUpperCase() === 'FINAL') : []
  const isFinalized = activeRows.length > 0
  const liveEvaluations = buildEvaluations(team, attendance, contributions, agendaMasters, contributionMasters, settings)
  const calculated = isFinalized ? activeRows.map(snapshotToEvaluation) : liveEvaluations
  const honorVisible = isFinalized || isPast
  const evaluations = honorVisible ? calculated : hideHonor(calculated)
  const effectiveSettings: Record<string, number> = { ...settings }
  if (isFinalized && activeRows[0]) effectiveSettings.HONOR_DASAR = Number(activeRows[0].honor_direkomendasikan || 0) + Number(activeRows[0].rekomendasi_potongan || 0)
  const summary: any = buildSummary(evaluations, contributions, attendance)
  if (!honorVisible) { summary.totalRecommendedDeduction = null; summary.totalRecommendedHonor = null; delete effectiveSettings.HONOR_DASAR }

  return {
    period, team, agendaMasters, contributionMasters, attendance, contributions, evaluations, summary, settings: effectiveSettings,
    finalization: { isFinalized, finalizationId, finalizedAt: activeRows[0]?.finalized_at || '', canFinalize: isPast && !isFinalized, periodState: isFinalized ? 'final' : periodState, currentPeriod: selectedCurrent, note: activeRows[0]?.catatan || '' },
    evaluationMode: isFinalized ? 'final' : isPast ? 'month_end' : 'hidden',
  }
}
