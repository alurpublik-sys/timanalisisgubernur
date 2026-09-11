create or replace function private.ah_admin_change_pin_impl(p_new_pin text)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, extensions
as $$
begin
  if not private.ah_admin_session_valid() then
    raise exception 'Sesi admin tidak valid.' using errcode = '42501';
  end if;
  if p_new_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN baru harus terdiri dari 6 angka.' using errcode = '22023';
  end if;

  update private.ah_admin_config
  set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 12))
  where singleton = true;

  delete from private.ah_admin_sessions;
  delete from private.ah_admin_attempts;
  return true;
end;
$$;

revoke all on function private.ah_admin_change_pin_impl(text) from public, authenticated;
grant execute on function private.ah_admin_change_pin_impl(text) to anon;

create or replace function public.ah_admin_change_pin(p_new_pin text)
returns boolean
language sql
volatile
security invoker
set search_path = pg_catalog, private
as $$
  select private.ah_admin_change_pin_impl(p_new_pin);
$$;

revoke all on function public.ah_admin_change_pin(text) from public, authenticated;
grant execute on function public.ah_admin_change_pin(text) to anon;
