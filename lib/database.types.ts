export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: Rel[] }

type Absensi = { agenda_event_id:string; bobot_agenda:number; created_at:string; detail_agenda:string; id:number; jenis_agenda:string; kode:string|null; lokasi:string|null; nama_anggota:string; status_kehadiran:string; tanggal:string; tim_id:number|null; updated_at:string }
type AdminPinAttempt = { attempt_count:number; blocked_until:string|null; fingerprint_hash:string; updated_at:string; window_started_at:string }
type Agenda = { created_at:string; id:number; kode:string|null; legacy_id:string|null; nama_agenda:string; pic:string|null; status:string; tanggal:string; tipe:string|null; updated_at:string }
type Finalisasi = { basis_evaluasi:string|null; catatan:string|null; finalization_id:string; finalized_at:string; hadir:number; honor_direkomendasikan:number; id:number; izin:number; kehadiran_wajib_pct:number; kode:string|null; label_rekomendasi:string|null; nama_anggota:string; nilai_evaluasi_pct:number; opd_excluded:boolean; opd_hadir:number; opd_pct:number; opd_required:number; output_selesai:number; peran:string|null; periode:string; poin_kontribusi:number; rapat_hadir:number; rapat_pct:number; rapat_required:number; rekomendasi_potongan:number; reopened_at:string|null; reopened_reason:string|null; required_agenda:number; status:string; tidak_hadir:number; tim_id:number|null; total_kontribusi:number }
type Isu = { created_at:string; id:number; kode:string|null; legacy_id:string|null; nama_isu:string; opd_terkait:string|null; prioritas:string|null; ringkasan:string|null; status_monitoring:string; updated_at:string }
type Kontribusi = { bobot:number; created_at:string; id:number; jenis_kontribusi:string; keterangan:string|null; kode:string|null; legacy_id:string|null; link_hasil:string|null; nama_anggota:string; status:string; tanggal:string; tim_id:number|null; updated_at:string }
type Kunjungan = { anggota_tim:string|null; created_at:string; id:number; kode:string|null; legacy_id:string|null; link_notulen:string|null; nama_opd:string; pejabat:string|null; status:string; tanggal:string; topik:string; updated_at:string }
type MasterAgenda = { bobot:number; created_at:string; id:number; kewajiban:string; nama_agenda:string; pengecualian:string|null; status:string; updated_at:string }
type MasterKontribusi = { bobot:number; created_at:string; id:number; khusus_tim:string|null; nama_kontribusi:string; status:string; updated_at:string }
type Media = { created_at:string; id:number; judul_berita:string; kode:string|null; legacy_id:string|null; link_berita:string|null; nama_media:string|null; sentimen:string|null; tanggal:string; updated_at:string }
type Pengaturan = { keterangan:string|null; kunci:string; nilai:number; updated_at:string }
type Rekomendasi = { created_at:string; id:number; judul:string; kode:string|null; legacy_id:string|null; link_doc:string|null; opd_terkait:string|null; pic:string|null; ringkasan:string|null; status:string; updated_at:string }
type Tim = { active:boolean; created_at:string; id:number; kode:string|null; legacy_id:string|null; link_cv:string|null; link_foto:string|null; nama:string; peran:string|null; updated_at:string }

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      absensi_agenda: Table<Absensi, { agenda_event_id:string; bobot_agenda?:number; created_at?:string; detail_agenda:string; id?:number; jenis_agenda:string; kode?:string|null; lokasi?:string|null; nama_anggota:string; status_kehadiran:string; tanggal:string; tim_id?:number|null; updated_at?:string }, Partial<Absensi>>
      admin_pin_attempts: Table<AdminPinAttempt, { attempt_count?:number; blocked_until?:string|null; fingerprint_hash:string; updated_at?:string; window_started_at?:string }, Partial<AdminPinAttempt>>
      agenda: Table<Agenda, { created_at?:string; id?:number; kode?:string|null; legacy_id?:string|null; nama_agenda:string; pic?:string|null; status?:string; tanggal:string; tipe?:string|null; updated_at?:string }, Partial<Agenda>>
      finalisasi_honor: Table<Finalisasi, { finalization_id:string; nama_anggota:string; periode:string } & Partial<Omit<Finalisasi,'finalization_id'|'nama_anggota'|'periode'>>, Partial<Finalisasi>>
      isu_strategis: Table<Isu, { created_at?:string; id?:number; kode?:string|null; legacy_id?:string|null; nama_isu:string; opd_terkait?:string|null; prioritas?:string|null; ringkasan?:string|null; status_monitoring?:string; updated_at?:string }, Partial<Isu>>
      kontribusi_kerja: Table<Kontribusi, { bobot?:number; created_at?:string; id?:number; jenis_kontribusi:string; keterangan?:string|null; kode?:string|null; legacy_id?:string|null; link_hasil?:string|null; nama_anggota:string; status?:string; tanggal:string; tim_id?:number|null; updated_at?:string }, Partial<Kontribusi>>
      kunjungan: Table<Kunjungan, { anggota_tim?:string|null; created_at?:string; id?:number; kode?:string|null; legacy_id?:string|null; link_notulen?:string|null; nama_opd:string; pejabat?:string|null; status?:string; tanggal:string; topik:string; updated_at?:string }, Partial<Kunjungan>>
      master_agenda: Table<MasterAgenda, { bobot?:number; created_at?:string; id?:number; kewajiban?:string; nama_agenda:string; pengecualian?:string|null; status?:string; updated_at?:string }, Partial<MasterAgenda>>
      master_kontribusi: Table<MasterKontribusi, { bobot?:number; created_at?:string; id?:number; khusus_tim?:string|null; nama_kontribusi:string; status?:string; updated_at?:string }, Partial<MasterKontribusi>>
      media_monitoring: Table<Media, { created_at?:string; id?:number; judul_berita:string; kode?:string|null; legacy_id?:string|null; link_berita?:string|null; nama_media?:string|null; sentimen?:string|null; tanggal:string; updated_at?:string }, Partial<Media>>
      pengaturan_kinerja: Table<Pengaturan, { keterangan?:string|null; kunci:string; nilai:number; updated_at?:string }, Partial<Pengaturan>>
      rekomendasi: Table<Rekomendasi, { created_at?:string; id?:number; judul:string; kode?:string|null; legacy_id?:string|null; link_doc?:string|null; opd_terkait?:string|null; pic?:string|null; ringkasan?:string|null; status?:string; updated_at?:string }, Partial<Rekomendasi>>
      tim_analisis: Table<Tim, { active?:boolean; created_at?:string; id?:number; kode?:string|null; legacy_id?:string|null; link_cv?:string|null; link_foto?:string|null; nama:string; peran?:string|null; updated_at?:string }, Partial<Tim>>
    }
    Views: { dashboard_stats: { Row: { total_agenda:number|null; total_isu:number|null; total_kunjungan:number|null; total_media:number|null; total_policy_brief:number|null }; Relationships: [] } }
    Functions: { next_attendance_event_id: { Args: never; Returns: string } }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
