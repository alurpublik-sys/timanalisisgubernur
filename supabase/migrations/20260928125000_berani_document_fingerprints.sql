-- Prevent repeated uploads of the exact same BERANI source document.
update public.berani_update_documents d
set metadata=coalesce(d.metadata,'{}'::jsonb) || jsonb_build_object(
  'sha256','9ac8710b84be9749736248c0d58ffb82e1b298008444fdaf59975c657e35e8a7'
)
from public.berani_updates u, public.berani_programs p
where d.update_id=u.id
  and u.program_id=p.id
  and p.slug='berani-cerdas'
  and d.file_name='Report BC - 8 Sept 2026.pdf'
  and d.file_size=3692034;

create unique index if not exists berani_update_documents_sha256_uidx
on public.berani_update_documents(update_id,(metadata->>'sha256'))
where metadata ? 'sha256' and nullif(metadata->>'sha256','') is not null;
