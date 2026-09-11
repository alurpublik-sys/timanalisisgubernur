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
  v_fingerprint constant text := 'global';
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
