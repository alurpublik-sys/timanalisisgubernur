# Anwar Hafid Strategic Center (AH Center)

Migrasi penuh AH Center dari Google Apps Script + Google Sheets menjadi aplikasi full-stack modern.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Supabase Auth + Row Level Security
- Server Components + Server Actions
- GitHub CI untuk typecheck dan production build
- Target deployment: Vercel

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

## Access Model

AH Center menggunakan tiga role:

- `viewer`: baca data internal
- `editor`: baca + input/update data operasional
- `admin`: editor + kelola user, Tim Analisis, master agenda, master kontribusi, dan parameter honor

Login Supabase Auth saja tidak otomatis memberikan akses. User juga harus memiliki row aktif pada `public.profiles`. User Auth tanpa profile aktif akan diarahkan ke halaman `Akses belum diaktifkan` yang menampilkan User ID untuk proses aktivasi.

### Bootstrap admin pertama

1. Buat user pertama melalui Supabase Auth.
2. Ambil UUID user tersebut dari Auth Users atau halaman `Akses belum diaktifkan`.
3. Dari Supabase SQL Editor, masukkan profile admin pertama:

```sql
insert into public.profiles (user_id, email, full_name, role, active)
values ('<AUTH_USER_UUID>', '<EMAIL>', '<NAMA>', 'admin', true);
```

Setelah admin pertama aktif, user berikutnya dapat dikelola dari menu **Pengaturan** di AH Center tanpa SQL manual.

## Environment

Salin `.env.example` menjadi `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
APP_TIMEZONE=Asia/Makassar
```

Jangan commit secret/service-role key ke repository.

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

Core data lama dipetakan dari Google Sheets menjadi tabel PostgreSQL, termasuk kunjungan, isu strategis, rekomendasi, media, agenda, tim, master agenda, master kontribusi, absensi agenda, kontribusi kerja, pengaturan kinerja, dan snapshot finalisasi honor.

Baseline schema disimpan di `supabase/migrations/` agar environment baru dapat direproduksi dari repository.

## Git Flow

Pengembangan aktif dilakukan pada branch `feat/ah-center-fullstack`. PR ke `main` tidak boleh di-merge sebelum CI hijau dan verifikasi fungsi selesai.
