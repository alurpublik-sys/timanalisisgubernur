create or replace function public.dashboard_public_payload()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
select jsonb_build_object(
  'overview', coalesce((select to_jsonb(d) from public.dashboard_overview d limit 1), '{}'::jsonb),
  'renstra_count', (select count(*) from public.renstra_opd where active = true),
  'reference_count', (select count(*) from public.content_references),
  'pending_references', (select count(*) from public.content_references where status in ('Draft','Perlu Verifikasi')),
  'programs', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order) from (select id,name,slug,summary,sort_order from public.berani_programs where active=true) x),'[]'::jsonb),
  'updated_program_ids', coalesce((select jsonb_agg(distinct program_id) from public.berani_updates),'[]'::jsonb),
  'recent_berani', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,program_id,title,period_label,row_count,created_at from public.berani_updates order by created_at desc limit 3) x),'[]'::jsonb),
  'recent_visits', coalesce((select jsonb_agg(to_jsonb(x) order by x.tanggal desc,x.id desc) from (select id,nama_opd,tanggal,topik,tanggal_estimasi,status from public.kunjungan order by tanggal desc,id desc limit 5) x),'[]'::jsonb),
  'recent_references', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (select id,opd_name,title,status,updated_at from public.content_references order by updated_at desc limit 4) x),'[]'::jsonb),
  'negative_media', coalesce((select jsonb_agg(to_jsonb(x) order by x.tanggal desc,x.id desc) from (select id,judul_berita,nama_media,tanggal,link_berita,issue_category from public.media_monitoring where sentimen='Negatif' order by tanggal desc,id desc limit 5) x),'[]'::jsonb)
)
$$;
grant execute on function public.dashboard_public_payload() to anon, authenticated;
