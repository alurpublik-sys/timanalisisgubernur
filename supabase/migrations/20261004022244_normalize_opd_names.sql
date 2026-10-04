create or replace function public.canonical_opd_name(input_name text)
returns text
language sql
stable
as $$
  select coalesce(
    (
      select m.display_name
      from public.opd_master m
      where lower(trim(m.display_name)) = lower(trim(input_name))
         or lower(trim(m.official_name)) = lower(trim(input_name))
         or (m.acronym is not null and lower(trim(m.acronym)) = lower(trim(input_name)))
      order by m.sort_order
      limit 1
    ),
    (
      select m.display_name
      from public.opd_aliases a
      join public.opd_master m on m.id = a.opd_id
      where a.alias_normalized = lower(regexp_replace(trim(input_name), '\s+', ' ', 'g'))
      order by m.sort_order
      limit 1
    ),
    nullif(trim(input_name),'')
  )
$$;

create or replace function public.normalize_opd_name_trigger()
returns trigger language plpgsql as $$
begin
  if tg_table_name = 'kunjungan' then new.nama_opd := public.canonical_opd_name(new.nama_opd);
  else new.opd_name := public.canonical_opd_name(new.opd_name);
  end if;
  return new;
end $$;

drop trigger if exists normalize_opd_kunjungan on public.kunjungan;
create trigger normalize_opd_kunjungan before insert or update of nama_opd on public.kunjungan for each row execute function public.normalize_opd_name_trigger();
drop trigger if exists normalize_opd_findings on public.opd_findings;
create trigger normalize_opd_findings before insert or update of opd_name on public.opd_findings for each row execute function public.normalize_opd_name_trigger();
drop trigger if exists normalize_opd_references on public.content_references;
create trigger normalize_opd_references before insert or update of opd_name on public.content_references for each row execute function public.normalize_opd_name_trigger();
drop trigger if exists normalize_opd_media on public.media_monitoring;
create trigger normalize_opd_media before insert or update of opd_name on public.media_monitoring for each row execute function public.normalize_opd_name_trigger();
drop trigger if exists normalize_opd_berani on public.berani_updates;
create trigger normalize_opd_berani before insert or update of opd_name on public.berani_updates for each row execute function public.normalize_opd_name_trigger();
drop trigger if exists normalize_opd_renstra on public.renstra_opd;
create trigger normalize_opd_renstra before insert or update of opd_name on public.renstra_opd for each row execute function public.normalize_opd_name_trigger();


update public.kunjungan set nama_opd=public.canonical_opd_name(nama_opd) where nama_opd is not null;
update public.opd_findings set opd_name=public.canonical_opd_name(opd_name) where opd_name is not null;
update public.content_references set opd_name=public.canonical_opd_name(opd_name) where opd_name is not null;
update public.media_monitoring set opd_name=public.canonical_opd_name(opd_name) where opd_name is not null;
update public.berani_updates set opd_name=public.canonical_opd_name(opd_name) where opd_name is not null;
update public.renstra_opd set opd_name=public.canonical_opd_name(opd_name) where opd_name is not null;
