do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'private')
     and not exists (
       select 1
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private'
     ) then
    execute 'drop schema private';
  end if;
end $$;
