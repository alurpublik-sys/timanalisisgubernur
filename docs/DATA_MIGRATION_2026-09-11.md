# AH Center — Production Data Migration (2026-09-11)

Source: complete AH Center workbook supplied by the project owner.
Target: Supabase project `suiiaiuxkhdsqufswpfv`.

## Storage rule

Operational/tabular data is stored in Supabase PostgreSQL. Google Docs used for visit minutes/notulensi remain in Google Drive. The `kunjungan.link_notulen` column stores only the Google Docs URL; document contents are not copied into PostgreSQL.

## Reconciled row counts

- Tim Analisis: 7
- Kunjungan OPD: 11
- Kunjungan with Google Docs notulensi URL: 11
- Isu Strategis: 4
- Policy Brief/Rekomendasi: 0 (source table is empty)
- Media Monitoring: 106
- Agenda & Tugas: 8
- Absensi: 34 member rows across 5 agenda events
- Kontribusi kerja: 2
- Finalisasi Honor: 0 (source table is empty)
- Master Agenda: 3
- Master Kontribusi: 7
- Pengaturan Kinerja: 11

Post-import integrity check: 0 orphan absensi references and 0 orphan kontribusi references.

## Normalization decisions

1. The source workbook contains duplicate legacy team ID `TIM-0003` for Rizal Liara and Muhammad Shadiq Muntashir. The normalized application IDs are:
   - TIM-0001 — Muhammad Shadiq Muntashir
   - TIM-0002 — Muhammad Maruf
   - TIM-0003 — Rizal Liara
   - TIM-0004 — Moh. Yasin
   - TIM-0005 — Fajri Ardiansyah
   - TIM-0006 — Sri Rezeki
   - TIM-0007 — Adiwarman
   The original source ID remains available through `legacy_id` for traceability.
2. In source event `ABS-0004`, Muhammad Shadiq Muntashir appears twice while Rizal Liara is absent, even though `Rapat Internal` is a `Semua Tim` agenda and the row set otherwise contains one record for every team member. The first duplicate entry was normalized to Rizal Liara while preserving the source attendance status (`Hadir`).
3. Historical absensi rows with blank `BOBOT_AGENDA` were resolved from active Master Agenda values (`Rapat Internal=4`, `Kunjungan OPD=5`) so evaluation results match the original Apps Script fallback behavior.
4. Source dates/content that appear unusual are retained rather than silently corrected. Example: source Kunjungan `KNJ-006` (Dinas TPH) is dated 2026-12-06 and remains so in Supabase.

## Repository policy

The repository is public, therefore production row data and private/operational content are not committed to Git. Only schema migrations, application code, and this non-sensitive migration audit are versioned.
