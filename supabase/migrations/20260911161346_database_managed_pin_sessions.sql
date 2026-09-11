create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ah_admin_config (
  singleton boolean primary key default true check (singleton),
  pin_hash text,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table private.ah_admin_config enable row level security;

create table if not exists private.ah_admin_sessions (
  token_hash bytea primary key,
  pin_version bigint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table private.ah_admin_sessions enable row level security;
create index if not exists ah_admin_sessions_expires_at_idx on private.ah_admin_sessions(expires_at);

create table if not exists private.ah_admin_attempts (
  fingerprint_hash text primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.ah_admin_attempts enable row level security;
create index if not exists ah_admin_attempts_blocked_until_idx on private.ah_admin_attempts(blocked_until);

insert into private.ah_admin_config(singleton)
values (true)
on conflict (singleton) do nothing;

create or replace function private.ah_admin_config_touch()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.pin_hash is distinct from old.pin_hash then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ah_admin_config_touch_trg on private.ah_admin_config;
create trigger ah_admin_config_touch_trg
before update on private.ah_admin_config
for each row execute function private.ah_admin_config_touch();

create or replace function private.ah_admin_session_valid()
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  v_headers jsonb;
  v_token text;
begin
  v_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  v_token := coalesce(v_headers->>'x-ah-session', '');
  if length(v_token) < 32 then
    return false;
  end if;

  return exists (
    select 1
    from private.ah_admin_sessions s
    join private.ah_admin_config c on c.singleton = true
    where s.token_hash = extensions.digest(v_token, 'sha256')
      and s.expires_at > now()
      and s.pin_version = c.version
  );
end;
$$;

revoke all on function private.ah_admin_session_valid() from public;
grant usage on schema private to anon;
grant execute on function private.ah_admin_session_valid() to anon;

create or replace function public.ah_admin_login(p_pin text)
returns table (
  success boolean,
  session_token text,
  expires_at timestamptz,
  error_code text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  v_headers jsonb;
  v_ip text;
  v_agent text;
  v_fingerprint text;
  v_attempt private.ah_admin_attempts%rowtype;
  v_now timestamptz := now();
  v_pin_hash text;
  v_pin_version bigint;
  v_still_in_window boolean;
  v_next_count integer;
  v_blocked_until timestamptz;
  v_token text;
  v_expires timestamptz;
begin
  v_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  v_ip := split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', 'unknown'), ',', 1);
  v_agent := coalesce(v_headers->>'user-agent', 'unknown');
  v_fingerprint := encode(extensions.digest(v_ip || '|' || v_agent, 'sha256'), 'hex');

  select * into v_attempt
  from private.ah_admin_attempts
  where fingerprint_hash = v_fingerprint;

  if found and v_attempt.blocked_until is not null and v_attempt.blocked_until > v_now then
    success := false;
    session_token := null;
    expires_at := null;
    error_code := 'rate_limited';
    return next;
    return;
  end if;

  select pin_hash, version
  into v_pin_hash, v_pin_version
  from private.ah_admin_config
  where singleton = true;

  if v_pin_hash is null then
    success := false;
    session_token := null;
    expires_at := null;
    error_code := 'configuration_missing';
    return next;
    return;
  end if;

  if p_pin !~ '^[0-9]{6}$' or extensions.crypt(p_pin, v_pin_hash) <> v_pin_hash then
    v_still_in_window := found and (v_now - v_attempt.window_started_at) < interval '15 minutes';
    v_next_count := case when v_still_in_window then v_attempt.attempt_count + 1 else 1 end;
    v_blocked_until := case when v_next_count >= 5 then v_now + interval '15 minutes' else null end;

    insert into private.ah_admin_attempts(
      fingerprint_hash, attempt_count, window_started_at, blocked_until, updated_at
    ) values (
      v_fingerprint,
      v_next_count,
      case when v_still_in_window then v_attempt.window_started_at else v_now end,
      v_blocked_until,
      v_now
    )
    on conflict (fingerprint_hash) do update set
      attempt_count = excluded.attempt_count,
      window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until,
      updated_at = excluded.updated_at;

    success := false;
    session_token := null;
    expires_at := null;
    error_code := case when v_blocked_until is not null then 'rate_limited' else 'invalid_pin' end;
    return next;
    return;
  end if;

  delete from private.ah_admin_attempts where fingerprint_hash = v_fingerprint;
  delete from private.ah_admin_sessions where expires_at <= v_now;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := v_now + interval '12 hours';

  insert into private.ah_admin_sessions(token_hash, pin_version, expires_at)
  values (extensions.digest(v_token, 'sha256'), v_pin_version, v_expires);

  success := true;
  session_token := v_token;
  expires_at := v_expires;
  error_code := null;
  return next;
end;
$$;

revoke all on function public.ah_admin_login(text) from public, authenticated;
grant execute on function public.ah_admin_login(text) to anon;

create or replace function public.ah_admin_session_check()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.ah_admin_session_valid();
$$;

revoke all on function public.ah_admin_session_check() from public, authenticated;
grant execute on function public.ah_admin_session_check() to anon;

create or replace function public.ah_admin_logout()
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  v_headers jsonb;
  v_token text;
begin
  v_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  v_token := coalesce(v_headers->>'x-ah-session', '');
  if length(v_token) < 32 then
    return false;
  end if;
  delete from private.ah_admin_sessions
  where token_hash = extensions.digest(v_token, 'sha256');
  return found;
end;
$$;

revoke all on function public.ah_admin_logout() from public, authenticated;
grant execute on function public.ah_admin_logout() to anon;

create or replace function public.next_attendance_event_id()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.ah_admin_session_valid() then
    raise exception 'Sesi admin tidak valid.' using errcode = '42501';
  end if;
  return 'ABS-' || lpad(nextval('public.abs_event_seq')::text, 4, '0');
end;
$$;

revoke all on function public.next_attendance_event_id() from public, authenticated;
grant execute on function public.next_attendance_event_id() to anon;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kunjungan','isu_strategis','rekomendasi','media_monitoring','agenda',
    'tim_analisis','master_agenda','master_kontribusi','absensi_agenda',
    'kontribusi_kerja','pengaturan_kinerja','finalisasi_honor'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to anon', t);
    execute format('drop policy if exists pin_admin_select on public.%I', t);
    execute format('drop policy if exists pin_admin_insert on public.%I', t);
    execute format('drop policy if exists pin_admin_update on public.%I', t);
    execute format('create policy pin_admin_select on public.%I for select to anon using ((select private.ah_admin_session_valid()))', t);
    execute format('create policy pin_admin_insert on public.%I for insert to anon with check ((select private.ah_admin_session_valid()))', t);
    execute format('create policy pin_admin_update on public.%I for update to anon using ((select private.ah_admin_session_valid())) with check ((select private.ah_admin_session_valid()))', t);
  end loop;
end
$$;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'kunjungan','isu_strategis','rekomendasi','media_monitoring','agenda',
        'tim_analisis','master_agenda','master_kontribusi','absensi_agenda',
        'kontribusi_kerja','pengaturan_kinerja','finalisasi_honor'
      )
      and policyname not in ('pin_admin_select','pin_admin_insert','pin_admin_update')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

do $$
declare
  s record;
begin
  for s in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format('revoke all on sequence %I.%I from authenticated', s.sequence_schema, s.sequence_name);
    execute format('grant usage, select on sequence %I.%I to anon', s.sequence_schema, s.sequence_name);
  end loop;
end
$$;

revoke all on table public.dashboard_stats from anon, authenticated;
grant select on table public.dashboard_stats to anon;

drop table if exists public.admin_pin_attempts;
