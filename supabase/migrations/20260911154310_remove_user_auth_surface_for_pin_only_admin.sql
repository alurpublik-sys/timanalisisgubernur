-- AH Center uses one server-side PIN admin session. No Supabase Auth users are part of the application model.

drop trigger if exists on_auth_user_created_create_profile on auth.users;

do $$
declare
  p record;
  t record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;

  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format(
      'create policy pin_only_deny_public on public.%I for all to anon, authenticated using (false) with check (false)',
      t.tablename
    );
    execute format('revoke all privileges on table public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

revoke all privileges on public.dashboard_stats from anon, authenticated;

alter table public.tim_analisis drop column if exists user_id;
drop table if exists public.profiles;

drop function if exists private.handle_new_auth_user();
drop function if exists private.has_role(text[]);
drop function if exists private.is_active_member();

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.next_attendance_event_id() to service_role;

revoke execute on function public.next_attendance_event_id() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
