create or replace view public.dashboard_overview
with (security_invoker = true)
as
select
  (select count(*)::bigint from public.kunjungan) as total_kunjungan,
  (select count(*)::bigint from public.isu_strategis) as total_isu,
  (select count(*)::bigint from public.rekomendasi) as total_policy_brief,
  (select count(*)::bigint from public.media_monitoring) as total_media,
  (select count(*)::bigint from public.agenda) as total_agenda,
  (select count(*)::bigint from public.tim_analisis where active = true) as total_tim,
  (select count(*)::bigint from public.media_monitoring where lower(coalesce(sentimen, '')) = 'positif') as media_positif,
  (select count(*)::bigint from public.media_monitoring where lower(coalesce(sentimen, '')) = 'netral') as media_netral,
  (select count(*)::bigint from public.media_monitoring where lower(coalesce(sentimen, '')) = 'negatif') as media_negatif,
  (select count(*)::bigint from public.isu_strategis where lower(coalesce(prioritas, '')) = 'tinggi') as isu_tinggi,
  (select count(*)::bigint from public.isu_strategis where lower(coalesce(prioritas, '')) = 'sedang') as isu_sedang,
  (select count(*)::bigint from public.isu_strategis where lower(coalesce(prioritas, '')) = 'rendah') as isu_rendah;

revoke all on public.dashboard_overview from public;
grant select on public.dashboard_overview to anon, authenticated;
