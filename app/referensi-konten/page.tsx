import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ContentReferenceLive } from '@/components/content-reference-live'
import { createContentReference, updateContentReference } from '@/lib/actions/content-references'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

type Params = { opd?: string; status?: string; q?: string; mode?: string; compose?: string }

const statuses = ['Draft', 'Perlu Verifikasi', 'Siap Dibagikan'] as const

function jsonUrls(value: Json) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function statusClass(value: string) {
  return value.toLowerCase().replaceAll(' ', '-')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(value))
}

export default async function ReferensiKontenPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const selectedOpd = String(params.opd || '').trim()
  const selectedStatus = String(params.status || '').trim()
  const q = String(params.q || '').trim()
  const shareMode = params.mode === 'share'
  const composeMode = params.compose === '1'
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])
  const adminMode = Boolean(user)

  const [{ data: programs, error: programError }, { data: visits, error: visitError }] = await Promise.all([
    supabase.from('berani_programs').select('id,name').eq('active', true).order('sort_order'),
    supabase.from('kunjungan').select('nama_opd').order('nama_opd'),
  ])
  if (programError) throw new Error(programError.message)
  if (visitError) throw new Error(visitError.message)

  let query = supabase.from('content_references').select('*').order('opd_name').order('sort_order').order('id')
  if (shareMode) query = query.eq('status', 'Siap Dibagikan')
  else if (selectedStatus) query = query.eq('status', selectedStatus)
  if (selectedOpd) query = query.eq('opd_name', selectedOpd)
  if (q) query = query.or(`title.ilike.%${q}%,program_label.ilike.%${q}%,detail.ilike.%${q}%,key_facts.ilike.%${q}%`)

  const { data: references, error } = await query
  if (error) throw new Error(error.message)

  const opdNames = [...new Set([
    ...(visits ?? []).map((item) => item.nama_opd),
    ...(references ?? []).map((item) => item.opd_name),
  ].map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))

  const programNames = new Map((programs ?? []).map((program) => [program.id, program.name]))
  const grouped = new Map<string, NonNullable<typeof references>>()
  for (const item of references ?? []) {
    const list = grouped.get(item.opd_name) ?? []
    list.push(item)
    grouped.set(item.opd_name, list)
  }

  return <AppShell active="/referensi-konten" title={shareMode ? 'Referensi Konten · Mode Bagikan' : 'Referensi Konten'} adminMode={adminMode}>
    <ContentReferenceLive />

    <section className="reference-premium-hero panel">
      <div>
        <p className="eyebrow">{shareMode ? 'MODE BAGIKAN' : 'PUSAT REFERENSI PROGRAM'}</p>
        <h2>{shareMode ? 'Informasi yang sudah siap dibagikan.' : 'Program OPD, angka penting, dan bahan komunikasi dalam format yang mudah dibaca.'}</h2>
        <p>{shareMode ? 'Mode ini hanya menampilkan data berstatus Siap Dibagikan.' : 'Data awal mengikuti dokumen “INFORMASI & REFERENSI UNTUK PEMBUATAN KONTEN PROGRAM PEMPROV SULTENG 2026” dan dapat diperbarui saat data baru masuk.'}</p>
      </div>
      <div className="reference-toolbar">
        {shareMode
          ? <Link className="compact-action-button" href="/referensi-konten" title="Kembali"><span>←</span><small>Kembali</small></Link>
          : <Link className="compact-action-button" href="/referensi-konten?mode=share" title="Mode Bagikan"><span>↗</span><small>Bagikan</small></Link>}
        {!shareMode && !adminMode ? <Link className="icon-action-button" href="/login?next=%2Freferensi-konten" title="Masuk untuk mengedit" aria-label="Masuk untuk mengedit">✎</Link> : null}
        {!shareMode && adminMode ? <a className="icon-action-button is-active" href="/referensi-konten?compose=1#tambah-referensi" title="Tambah referensi" aria-label="Tambah referensi">＋</a> : null}
      </div>
    </section>

    {!shareMode ? <section className="panel premium-filter-panel">
      <form method="get" className="premium-filter-form content-premium-filter">
        <label><span>OPD</span><select name="opd" defaultValue={selectedOpd}><option value="">Semua OPD</option>{opdNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Status</span><select name="status" defaultValue={selectedStatus}><option value="">Semua status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="filter-search-wide"><span>Cari</span><input name="q" defaultValue={q} placeholder="Program, angka, inovasi..." /></label>
        <button className="secondary-button" type="submit">Terapkan</button>
        {(selectedOpd || selectedStatus || q) ? <Link className="ghost-button dark" href="/referensi-konten">Reset</Link> : null}
      </form>
      <div className="premium-result-count"><strong>{references?.length ?? 0}</strong><span>bahan tampil</span></div>
    </section> : null}

    {!shareMode && adminMode ? <details className="panel reference-admin-create" id="tambah-referensi" open={composeMode}>
      <summary><span>＋</span><div><strong>Tambah Referensi</strong><small>Form hanya tampil dalam mode edit administrator.</small></div></summary>
      <form action={createContentReference} className="mini-form reference-create-compact">
        <label>Nama OPD<input name="opd_name" list="content-opd-options" required placeholder="Pilih atau ketik OPD" /></label>
        <datalist id="content-opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist>
        <label>Judul Program / Angle<input name="title" required placeholder="Judul yang singkat dan jelas" /></label>
        <label>Label Program<input name="program_label" placeholder="Contoh: SIGANA / BERANI Cerdas" /></label>
        <label>Detail<textarea name="detail" placeholder="Jelaskan program secara singkat." /></label>
        <label>Fakta / Angka Utama<textarea name="key_facts" placeholder="Angka, sasaran, capaian, lokasi, atau manfaat." /></label>
        <label>Terkait 9 BERANI<select name="berani_program_id" defaultValue=""><option value="">Tidak dikaitkan</option>{(programs ?? []).map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
        <label>Status<select name="status" defaultValue="Draft">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Referensi URL<textarea name="reference_urls" placeholder={"Satu link per baris\nhttps://..."} /></label>
        <label>Sumber Internal<input name="source_label" placeholder="Notulensi / dokumen / OPD" /></label>
        <label>Urutan<input name="sort_order" type="number" min="0" defaultValue="0" /></label>
        <button className="primary-button" type="submit">Simpan Referensi</button>
      </form>
    </details> : null}

    <section className="reference-opd-groups premium-reference-groups">
      {[...grouped.entries()].map(([opd, items]) => <section className="reference-opd-section" key={opd}>
        <div className="reference-opd-heading">
          <div><p className="eyebrow">ORGANISASI PERANGKAT DAERAH</p><h2>{opd}</h2></div>
          <span>{items.length} bahan</span>
        </div>
        <div className="reference-card-grid premium-reference-grid">
          {items.map((item, index) => {
            const links = jsonUrls(item.reference_urls)
            return <article className="reference-card premium-reference-card panel" key={item.id}>
              <div className="reference-card-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="reference-card-top">
                <div>
                  {item.program_label ? <span className="reference-program">{item.program_label}</span> : null}
                  <h3>{item.title}</h3>
                </div>
                <div className="reference-card-tools">
                  <span className={`reference-status status-${statusClass(item.status)}`}>{item.status}</span>
                  {!shareMode && adminMode ? <details className="reference-inline-editor">
                    <summary title="Edit referensi" aria-label="Edit referensi">✎</summary>
                    <div className="reference-editor-popover">
                      <form action={updateContentReference} className="mini-form reference-edit-form">
                        <input type="hidden" name="id" value={item.id} />
                        <label>OPD<input name="opd_name" defaultValue={item.opd_name} required /></label>
                        <label>Judul<input name="title" defaultValue={item.title} required /></label>
                        <label>Label program<input name="program_label" defaultValue={item.program_label || ''} /></label>
                        <label>Detail<textarea name="detail" defaultValue={item.detail || ''} /></label>
                        <label>Fakta utama<textarea name="key_facts" defaultValue={item.key_facts || ''} /></label>
                        <label>9 BERANI<select name="berani_program_id" defaultValue={item.berani_program_id || ''}><option value="">Tidak dikaitkan</option>{(programs ?? []).map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
                        <label>Status<select name="status" defaultValue={item.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                        <label>Referensi URL<textarea name="reference_urls" defaultValue={links.join('\n')} /></label>
                        <label>Sumber<input name="source_label" defaultValue={item.source_label || ''} /></label>
                        <label>Urutan<input name="sort_order" type="number" min="0" defaultValue={item.sort_order} /></label>
                        <button className="secondary-button" type="submit">Simpan Perubahan</button>
                      </form>
                    </div>
                  </details> : null}
                </div>
              </div>
              {item.detail ? <p className="reference-detail">{item.detail}</p> : null}
              {item.key_facts ? <div className="reference-facts premium-reference-facts"><span>FAKTA UTAMA</span><p>{item.key_facts}</p></div> : null}
              <div className="reference-meta">
                {item.berani_program_id ? <span>{programNames.get(item.berani_program_id) || '9 BERANI'}</span> : null}
                {item.source_label ? <span>{item.source_label}</span> : null}
                <span>Diperbarui {formatDate(item.updated_at)}</span>
              </div>
              {links.length ? <div className="reference-links premium-reference-links">{links.map((url, linkIndex) => <a key={url} href={url} target="_blank" rel="noreferrer">Sumber {linkIndex + 1} ↗</a>)}</div> : null}
            </article>
          })}
        </div>
      </section>)}
      {(references ?? []).length === 0 ? <section className="panel empty-document-panel"><p className="eyebrow">BELUM ADA DATA</p><h2>Referensi tidak ditemukan</h2><p>Ubah filter untuk melihat data lain.</p></section> : null}
    </section>
  </AppShell>
}
