drop policy if exists public_read on public.opd_findings;
create policy public_read on public.opd_findings
for select to anon
using (public.ah_admin_session_check());

drop policy if exists public_read on public.opd_finding_documents;
create policy public_read on public.opd_finding_documents
for select to anon
using (public.ah_admin_session_check());
