# Anwar Hafid Strategic Center (AH Center)

Migrasi penuh AH Center dari Google Apps Script + Google Sheets menjadi aplikasi full-stack modern.

## Arsitektur

- Next.js 16 App Router + TypeScript
- Supabase PostgreSQL
- Supabase Auth + Row Level Security
- Server Components + Server Actions
- GitHub CI untuk typecheck dan production build
- Target deployment: Vercel

## Prinsip penyimpanan data

Seluruh data operasional/tabular AH Center disimpan di Supabase PostgreSQL. Google Sheets/Apps Script tidak lagi menjadi backend aplikasi.

**Pengecualian:** notulensi Kunjungan OPD tetap sebagai Google Docs di Google Drive. AH Center hanya menyimpan URL dokumen pada `kunjungan.link_notulen`, sehingga dokumen asli tetap menjadi sumber utama dan tidak diduplikasi ke PostgreSQL.

## Modul

- Dashboard Strategis
- Kunjungan OPD
- Isu Strategis
- Policy Brief / Rekomendasi
- Media Monitor
- Agenda & Tugas
- Tim Analisis
- Kinerja & Honor
- Pengaturan & Master Data

## Kinerja & Honor

Mesin evaluasi mempertahankan aturan aplikasi lama:

- Hadir = faktor 1
- Izin = faktor 0,5
- Tidak Hadir = faktor 0
- Kunjungan OPD mengecualikan anggota sesuai Master Agenda
- agenda `Semua Tim` mewajibkan seluruh anggota relevan
- kontribusi berpoin hanya dihitung selesai
- Kunjungan OPD dan Rapat Internal dapat menjadi batas bawah evaluasi jika jumlah agenda inti memenuhi minimum
- rekomendasi honor bulan berjalan disembunyikan
- periode lampau dapat difinalisasi sebagai snapshot
- snapshot final dapat dibuka kembali untuk koreksi dan difinalisasi ulang
- hanya admin yang dapat finalisasi/buka ulang snapshot honor
- database mencegah dua snapshot `FINAL` aktif untuk anggota dan periode yang sama

## Access Model

AH Center menggunakan tiga role:

- `viewer`: baca data internal
- `editor`: baca + input/update data operasional, absensi, dan kontribusi
- `admin`: editor + kelola user, Tim Analisis, master agenda, master kontribusi, parameter honor, finalisasi, dan buka ulang evaluasi

User baru dari Supabase Auth otomatis mendapat row `public.profiles` dengan `role = viewer` dan `active = false`. Akun tersebut belum dapat membaca data internal sampai admin mengaktifkannya. Halaman `Akses belum diaktifkan` menampilkan email dan User ID untuk proses aktivasi.

### Bootstrap admin pertama

Project sengaja **tidak** otomatis mempromosikan user pertama menjadi admin. Ini mencegah akun pertama yang tidak disengaja mengambil hak akses tertinggi.

1. Buat akun pertama yang memang ditetapkan sebagai admin melalui Supabase Auth.
2. Pastikan email/UUID Auth benar.
3. Promote profile yang sudah dibuat otomatis oleh trigger:

```sql
update public.profiles
set role = 'admin',
    active = true,
    updated_at = now()
where user_id = (
  select id
  from auth.users
  where lower(email) = lower('ADMIN_EMAIL_HERE')
  limit 1
);
```

4. Pastikan hanya akun yang dimaksud yang aktif sebagai admin:

```sql
select user_id, email, full_name, role, active
from public.profiles
where role = 'admin' and active = true;
```

5. Login ke AH Center. User berikutnya otomatis muncul sebagai profile nonaktif dan dapat diaktifkan/diubah rolenya dari menu **Pengaturan**.

Runbook lengkap tersedia di `docs/ADMIN_BOOTSTRAP.md`.

## Environment

Salin `.env.example` menjadi `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
APP_TIMEZONE=Asia/Makassar
```

Publishable key boleh digunakan oleh client, tetapi jangan pernah commit service-role key atau credential sensitif ke repository.

## Local Development

```bash
npm install
npm run dev
```

Verifikasi sebelum merge:

```bash
npm run typecheck
npm run build
```

## Database

Supabase project ref: `suiiaiuxkhdsqufswpfv`.

Data produksi yang dimigrasikan dari workbook AH Center tidak disimpan di repository publik. Repository hanya menyimpan schema/migration, aplikasi, dan dokumentasi audit migrasi.

Baseline dan perubahan schema disimpan di `supabase/migrations/` agar environment baru dapat direproduksi dari repository.

Audit migrasi produksi: `docs/DATA_MIGRATION_2026-09-11.md`.

## Deployment checklist

Sebelum merge/deploy production:

- CI branch hijau (`npm install`, `npm run typecheck`, `npm run build`)
- Supabase Security Advisor tidak memiliki finding
- akun admin pertama sudah dibuat dan diverifikasi
- login admin, editor, viewer, dan access-pending diuji end-to-end
- Vercel project yang benar sudah dipastikan
- Vercel env memiliki `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `APP_TIMEZONE`
- preview deployment diuji sebelum production promotion
- PR tetap draft sampai checklist di atas selesai

## Git Flow

Pengembangan aktif dilakukan pada branch `feat/ah-center-fullstack`. PR ke `main` tidak boleh di-merge sebelum CI hijau dan verifikasi fungsi selesai.
