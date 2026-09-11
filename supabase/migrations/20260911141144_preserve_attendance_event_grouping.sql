-- Preserve one agenda_event_id across all member rows while keeping row codes unique.
alter table public.absensi_agenda drop column if exists kode;
alter table public.absensi_agenda
  add column kode text generated always as ('ABS-' || lpad(id::text, 4, '0')) stored unique;
