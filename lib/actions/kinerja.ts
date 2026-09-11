'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'
import { getKinerjaData, isContributionAllowed, isMemberExcluded, normalizePeriod } from '@/lib/kinerja'

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
function required(fd: FormData, key: string, label: string) {
  const result = text(fd, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  return result
}
function refreshKinerja() { revalidatePath('/kinerja'); revalidatePath('/dashboard') }

async function assertOpen(period: string) {
  const { supabase } = await requireActionUser(['admin', 'editor'])
  const { data, error } = await supabase.from('finalisasi_honor').select('id').eq('periode', period).eq('status', 'FINAL').limit(1)
  if (error) throw new Error(error.message)
  if (data?.length) throw new Error(`Periode ${period} sudah difinalisasi. Buka evaluasi terlebih dahulu sebelum mengubah data.`)
  return supabase
}

export async function saveAbsensiAgenda(formData: FormData) {
  const tanggal = required(formData, 'tanggal', 'Tanggal')
  const supabase = await assertOpen(tanggal.slice(0, 7))
  const jenisAgenda = required(formData, 'jenis_agenda', 'Jenis agenda')
  const detailAgenda = required(formData, 'detail_agenda', 'Nama/detail agenda')
  const lokasi = text(formData, 'lokasi')
  const [{ data: master, error: masterError }, { data: team, error: teamError }] = await Promise.all([
    supabase.from('master_agenda').select('*').eq('nama_agenda', jenisAgenda).eq('status', 'Aktif').maybeSingle(),
    supabase.from('tim_analisis').select('*').eq('active', true).order('id'),
  ])
  if (masterError) throw new Error(masterError.message)
  if (teamError) throw new Error(teamError.message)
  if (!master) throw new Error('Jenis agenda tidak aktif atau tidak ditemukan di Master Agenda.')

  const eligible = (team || []).filter((member) => !isMemberExcluded(member, master))
  const submitted = eligible.map((member) => ({ member, status: text(formData, `member_${member.id}`) })).filter((item) => item.status)
  if (String(master.kewajiban).toLowerCase() === 'semua tim') {
    const missing = eligible.filter((member) => !text(formData, `member_${member.id}`))
    if (missing.length) throw new Error(`Agenda ini wajib untuk semua anggota terkait. Data belum lengkap: ${missing.map((m) => m.nama).join(', ')}`)
  }
  if (!submitted.length) throw new Error('Pilih minimal satu anggota yang relevan untuk agenda ini.')
  submitted.forEach((item) => { if (!['Hadir', 'Izin', 'Tidak Hadir'].includes(item.status)) throw new Error('Status kehadiran tidak valid.') })

  const { data: eventId, error: idError } = await supabase.rpc('next_attendance_event_id')
  if (idError) throw new Error(idError.message)
  const rows = submitted.map(({ member, status }) => ({ agenda_event_id: eventId, tanggal, jenis_agenda: jenisAgenda, detail_agenda: detailAgenda, lokasi, tim_id: member.id, nama_anggota: member.nama, status_kehadiran: status, bobot_agenda: Number(master.bobot || 1) }))
  const { error } = await supabase.from('absensi_agenda').insert(rows)
  if (error) throw new Error(error.message)
  refreshKinerja()
}

export async function saveKontribusiKerja(formData: FormData) {
  const tanggal = required(formData, 'tanggal', 'Tanggal')
  const supabase = await assertOpen(tanggal.slice(0, 7))
  const timId = Number(required(formData, 'tim_id', 'Anggota tim'))
  const jenis = required(formData, 'jenis_kontribusi', 'Jenis kontribusi')
  const keterangan = required(formData, 'keterangan', 'Judul/keterangan pekerjaan')
  const status = text(formData, 'status') || 'Dalam Proses'
  if (!['Dalam Proses', 'Selesai'].includes(status)) throw new Error('Status kontribusi tidak valid.')
  const [{ data: member, error: memberError }, { data: master, error: masterError }] = await Promise.all([
    supabase.from('tim_analisis').select('*').eq('id', timId).eq('active', true).maybeSingle(),
    supabase.from('master_kontribusi').select('*').eq('nama_kontribusi', jenis).eq('status', 'Aktif').maybeSingle(),
  ])
  if (memberError) throw new Error(memberError.message)
  if (masterError) throw new Error(masterError.message)
  if (!member) throw new Error('Anggota tim tidak ditemukan.')
  if (!master) throw new Error('Jenis kontribusi tidak aktif atau tidak ditemukan.')
  if (!isContributionAllowed(member, master)) throw new Error(`${jenis} hanya tersedia untuk anggota yang ditentukan pada Master Kontribusi.`)
  const { error } = await supabase.from('kontribusi_kerja').insert({ tanggal, tim_id: member.id, nama_anggota: member.nama, jenis_kontribusi: jenis, keterangan, status, link_hasil: text(formData, 'link_hasil'), bobot: Number(master.bobot || 1) })
  if (error) throw new Error(error.message)
  refreshKinerja()
}

export async function finalizeKinerjaPeriod(formData: FormData) {
  const period = normalizePeriod(required(formData, 'period', 'Periode'))
  const { supabase } = await requireActionUser(['admin'])
  const data = await getKinerjaData(period)
  if (!data.finalization.canFinalize) {
    if (data.finalization.periodState === 'current') throw new Error('Evaluasi honorarium baru dapat dibuka setelah bulan benar-benar berakhir.')
    if (data.finalization.periodState === 'future') throw new Error('Periode mendatang belum dapat difinalisasi.')
    throw new Error(`Periode ${period} belum dapat difinalisasi.`)
  }
  if (!data.evaluations.some((item: any) => Number(item.requiredAgendaCount || 0) > 0)) throw new Error(`Belum ada agenda wajib yang cukup untuk difinalisasi pada periode ${period}.`)
  const finalizationId = `FIN-${period.replace('-', '')}-${Date.now()}`
  const now = new Date().toISOString()
  const rows = data.evaluations.map((item: any) => ({
    finalization_id: finalizationId, periode: period, finalized_at: now, status: 'FINAL', tim_id: item.dbId, nama_anggota: item.NAMA, peran: item.PERAN,
    required_agenda: Number(item.requiredAgendaCount || 0), hadir: Number(item.hadir || 0), izin: Number(item.izin || 0), tidak_hadir: Number(item.tidakHadir || 0), kehadiran_wajib_pct: item.attendanceRate,
    opd_excluded: !!item.opdExcluded, opd_required: Number(item.opdRequired || 0), opd_hadir: Number(item.opdHadir || 0), opd_pct: item.opdRate,
    rapat_required: Number(item.rapatRequired || 0), rapat_hadir: Number(item.rapatHadir || 0), rapat_pct: item.rapatRate,
    total_kontribusi: Number(item.totalContributions || 0), output_selesai: Number(item.completedContributions || 0), poin_kontribusi: Number(item.contributionPoints || 0),
    basis_evaluasi: item.honorBasis || 'Kehadiran Wajib', nilai_evaluasi_pct: item.honorEvaluationRate, rekomendasi_potongan: Number(item.recommendedDeduction || 0),
    honor_direkomendasikan: Number(item.recommendedHonor || 0), label_rekomendasi: item.recommendationLabel || '', catatan: '',
  }))
  const { error } = await supabase.from('finalisasi_honor').insert(rows)
  if (error) throw new Error(error.message)
  refreshKinerja()
}

export async function reopenKinerjaPeriod(formData: FormData) {
  const period = normalizePeriod(required(formData, 'period', 'Periode'))
  const note = text(formData, 'note')
  const { supabase } = await requireActionUser(['admin'])
  const data = await getKinerjaData(period)
  if (!data.finalization.isFinalized || !data.finalization.finalizationId) throw new Error(`Periode ${period} belum difinalisasi.`)
  const reopenedAt = new Date().toISOString()
  const noteText = `Dibuka ulang ${reopenedAt}${note ? ` — ${note}` : ''}`
  const { error } = await supabase.from('finalisasi_honor').update({ status: 'DIBUKA', reopened_at: reopenedAt, reopened_reason: note, catatan: noteText }).eq('finalization_id', data.finalization.finalizationId).eq('periode', period).eq('status', 'FINAL')
  if (error) throw new Error(error.message)
  refreshKinerja()
}
