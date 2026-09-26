import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ContentReferenceLive } from '@/components/content-reference-live'
import { createContentReference, deleteContentReference, updateContentReference } from '@/lib/actions/content-references'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

type Params = { opd?: string; status?: string; q?: string; mode?: string }

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
  const supabase = await createClient(null)

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

  return <AppShell active="/referensi-konten" title={shareMode ? 'Referensi Konten · Mode Bagikan' : 'Informasi & Referensi Konten'}>
    <ContentReferenceLive />

    <section className="knowledge-hero panel content-reference-hero">
      <div>
        <p className="eyebrow">{shareMode ? 'TAMPILAN UNTUK DIBAGIKAN' : 'PUSAT INFORMASI PUBLIK'}</p>
        <h2>{shareMode ? 'Hanya informasi yang berstatus siap dibagikan.' : 'Bahan program OPD yang mudah dibaca dan selalu terbarui.'}</h2>
        <p>{shareMode ? 'Halaman ini menyembunyikan editor internal dan hanya menampilkan referensi yang telah ditandai siap dibagikan.' : 'Setiap OPD dapat memiliki banyak program atau angle informasi. Status membantu memisahkan draft internal, data yang masih perlu diverifikasi, dan bahan yang siap diberikan kepada influencer.'}</p>
      </div>
      <div className="hero-actions reference-mode-actions">
        {shareMode
          ? <Link className="secondary-button" href="/referensi-konten">Kembali ke Editor</Link>
          : <Link className="primary-button" href="/referensi-konten?mode=share">Mode Bagikan</Link>}
      </div>
    </section>

    {!shareMode ? <section className="opd-selector panel content-filter-panel">
      <form method="get" className="opd-selector-form content-filter-form">
        <label>OPD<select name="opd" defaultValue={selectedOpd}><option value="">Semua OPD</option>{opdNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={selectedStatus}><option value="">Semua status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Cari<input name="q" defaultValue={q} placeholder="Program, angka, inovasi..." /></label>
        <button className="secondary-button" type="submit">Terapkan</button>
        {(selectedOpd || selectedStatus || q) ? <Link className="secondary-button" href="/referensi-konten">Reset</Link> : null}
      </form>
      <div className="opd-selector-stat"><strong>{references?.length ?? 0}</strong><span>referensi tampil</span></div>
    </section> : null}

    {!shareMode ? <section className="content-reference-editor-grid">
      <form action={createContentReference} className="panel form-card reference-create-card">
        <div className="section-heading"><p className="eyebrow">TAMBAH REFERENSI</p><h2>Program / Informasi OPD</h2></div>
        <label>Nama OPD<input name="opd_name" list="content-opd-options" required placeholder="Pilih atau ketik OPD" /></label>
        <datalist id="content-opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist>
        <label>Judul Program / Angle<input name="title" required placeholder="Contoh: SIGANA — laporan bencana dari masyarakat" /></label>
        <label>Nama / Label Program<input name="program_label" placeholder="Contoh: SIGANA / BERANI Cerdas" /></label>
        <label>Detail<textarea name="detail" placeholder="Apa programnya dan bagaimana kerjanya?" /></label>
        <label>Fakta / Angka Utama<textarea name="key_facts" placeholder="Tuliskan angka, sasaran, capaian, lokasi, atau manfaat utama." /></label>
        <label>Terkait 9 BERANI<select name="berani_program_id" defaultValue=""><option value="">Tidak dikaitkan</option>{(programs ?? []).map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
        <label>Status<select name="status" defaultValue="Draft">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Referensi URL<textarea name="reference_urls" placeholder={"Satu link per baris\nhttps://..."} /></label>
        <label>Sumber Internal<input name="source_label" placeholder="Notulensi / dokumen / OPD" /></label>
        <label>Urutan<input name="sort_order" type="number" min="0" defaultValue="0" /></label>
        <button className="primary-button" type="submit">Simpan Referensi</button>
      </form>

      <article className="panel reference-guide-card">
        <p className="eyebrow">ALUR KERJA</p>
        <h2>Dari data internal menjadi bahan yang aman dibagikan.</h2>
        <div className="reference-workflow">
          <div><strong>01</strong><span>Masukkan informasi dari notulensi, dokumen, atau OPD.</span></div>
          <div><strong>02</strong><span>Tandai <b>Perlu Verifikasi</b> bila angka atau klaim masih perlu dicek.</span></div>
          <div><strong>03</strong><span>Ubah menjadi <b>Siap Dibagikan</b> setelah data sudah layak diberikan keluar.</span></div>
          <div><strong>04</strong><span>Mode Bagikan otomatis hanya menampilkan informasi yang siap.</span></div>
        </div>
        <p className="muted-line">Perubahan pada referensi akan memicu refresh real-time bagi halaman yang sedang dibuka.</p>
      </article>
    </section> : null}

    <section className="reference-opd-groups">
      {[...grouped.entries()].map(([opd, items]) => <section className="reference-opd-section" key={opd}>
        <div className="reference-opd-heading"><div><p className="eyebrow">ORGANISASI PERANGKAT DAERAH</p><h2>{opd}</h2></div><span>{items.length} bahan</span></div>
        <div className="reference-card-grid">
          {items.map((item) => {
            const links = jsonUrls(item.reference_urls)
            return <article className="reference-card panel" key={item.id}>
              <div className="reference-card-top">
                <div>
                  {item.program_label ? <span className="reference-program">{item.program_label}</span> : null}
                  <h3>{item.title}</h3>
                </div>
                <span className={`reference-status status-${statusClass(item.status)}`}>{item.status}</span>
              </div>
              {item.detail ? <p className="reference-detail">{item.detail}</p> : null}
              {item.key_facts ? <div className="reference-facts"><span>Fakta utama</span><p>{item.key_facts}</p></div> : null}
              <div className="reference-meta">
                {item.berani_program_id ? <span>{programNames.get(item.berani_program_id) || '9 BERANI'}</span> : null}
                {item.source_label ? <span>{item.source_label}</span> : null}
                <span>Diperbarui {formatDate(item.updated_at)}</span>
              </div>
              {links.length ? <div className="reference-links">{links.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Referensi {index + 1} ↗</a>)}</div> : null}

              {!shareMode ? <div className="finding-actions reference-actions">
                <details>
                  <summary>Edit</summary>
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
                </details>
                <form action={deleteContentReference}><input type="hidden" name="id" value={item.id} /><button className="text-danger-button" type="submit">Hapus</button></form>
              </div> : null}
            </article>
          })}
        </div>
      </section>)}
      {(references ?? []).length === 0 ? <section className="panel empty-document-panel"><p className="eyebrow">BELUM ADA DATA</p><h2>Referensi tidak ditemukan</h2><p>Ubah filter atau tambahkan informasi program baru.</p></section> : null}
    </section>
  </AppShell>
}
