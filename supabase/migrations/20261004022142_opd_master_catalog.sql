create table if not exists public.opd_master (
  id bigserial primary key,
  slug text not null unique,
  display_name text not null unique,
  official_name text not null,
  acronym text,
  entity_type text not null default 'Perangkat Daerah'
    check (entity_type in ('Badan','Dinas','Inspektorat','Satuan','Sekretariat','UPT')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opd_aliases (
  id bigserial primary key,
  opd_id bigint not null references public.opd_master(id) on delete cascade,
  alias text not null,
  alias_normalized text generated always as (lower(regexp_replace(trim(alias), '\s+', ' ', 'g'))) stored,
  created_at timestamptz not null default now(),
  unique(alias_normalized)
);

alter table public.opd_master enable row level security;
alter table public.opd_aliases enable row level security;

drop policy if exists "Public can read OPD master" on public.opd_master;
create policy "Public can read OPD master" on public.opd_master for select using (true);
drop policy if exists "Public can read OPD aliases" on public.opd_aliases;
create policy "Public can read OPD aliases" on public.opd_aliases for select using (true);

insert into public.opd_master (slug,display_name,official_name,acronym,entity_type,sort_order)
values
('bkd','Badan Kepegawaian Daerah','Badan Kepegawaian Daerah Provinsi Sulawesi Tengah','BKD','Badan',10),
('kesbangpol','Badan Kesatuan Bangsa dan Politik Daerah','Badan Kesatuan Bangsa dan Politik Daerah Provinsi Sulawesi Tengah','Kesbangpol','Badan',20),
('bpbd','Badan Penanggulangan Bencana Daerah','Badan Penanggulangan Bencana Daerah Provinsi Sulawesi Tengah','BPBD','Badan',30),
('bapenda','Badan Pendapatan Daerah','Badan Pendapatan Daerah Provinsi Sulawesi Tengah','Bapenda','Badan',40),
('bpkad','Badan Pengelolaan Keuangan dan Aset Daerah','Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Sulawesi Tengah','BPKAD','Badan',50),
('bpsdm','Badan Pengembangan Sumber Daya Manusia','Badan Pengembangan Sumber Daya Manusia Provinsi Sulawesi Tengah','BPSDM','Badan',60),
('badan-penghubung','Badan Penghubung','Badan Penghubung Provinsi Sulawesi Tengah',null,'Badan',70),
('bappeda','Badan Perencanaan Pembangunan Daerah','Badan Perencanaan Pembangunan Daerah Provinsi Sulawesi Tengah','Bappeda','Badan',80),
('brida','Badan Riset dan Inovasi Daerah','Badan Riset dan Inovasi Daerah Provinsi Sulawesi Tengah','BRIDA','Badan',90),
('bmpr','Dinas Bina Marga dan Penataan Ruang','Dinas Bina Marga dan Penataan Ruang Provinsi Sulawesi Tengah','BMPR','Dinas',110),
('cikasda','Dinas Cipta Karya dan Sumber Daya Air','Dinas Cipta Karya dan Sumber Daya Air Provinsi Sulawesi Tengah','CIKASDA','Dinas',120),
('esdm','Dinas Energi dan Sumber Daya Mineral','Dinas Energi dan Sumber Daya Mineral Provinsi Sulawesi Tengah','ESDM','Dinas',130),
('disbud','Dinas Kebudayaan','Dinas Kebudayaan Provinsi Sulawesi Tengah','Disbud','Dinas',140),
('kehutanan','Dinas Kehutanan','Dinas Kehutanan Provinsi Sulawesi Tengah',null,'Dinas',150),
('dislutkan','Dinas Kelautan dan Perikanan','Dinas Kelautan dan Perikanan Provinsi Sulawesi Tengah','Dislutkan','Dinas',160),
('disdukcapil','Dinas Kependudukan dan Pencatatan Sipil','Dinas Kependudukan dan Pencatatan Sipil Provinsi Sulawesi Tengah','Disdukcapil','Dinas',170),
('dinkes','Dinas Kesehatan','Dinas Kesehatan Provinsi Sulawesi Tengah','Dinkes','Dinas',180),
('dkips','Dinas Komunikasi, Informatika, Persandian dan Statistik','Dinas Komunikasi, Informatika, Persandian dan Statistik Provinsi Sulawesi Tengah','DKIPS','Dinas',190),
('dkukm','Dinas Koperasi, Usaha Kecil dan Menengah','Dinas Koperasi, Usaha Kecil dan Menengah Provinsi Sulawesi Tengah','DKUKM','Dinas',200),
('dlh','Dinas Lingkungan Hidup','Dinas Lingkungan Hidup Provinsi Sulawesi Tengah','DLH','Dinas',210),
('dinas-pangan','Dinas Pangan','Dinas Pangan Provinsi Sulawesi Tengah',null,'Dinas',220),
('pariwisata','Dinas Pariwisata','Dinas Pariwisata Provinsi Sulawesi Tengah',null,'Dinas',230),
('pmd','Dinas Pemberdayaan Masyarakat dan Desa','Dinas Pemberdayaan Masyarakat dan Desa Provinsi Sulawesi Tengah','PMD','Dinas',240),
('dp3a','Dinas Pemberdayaan Perempuan dan Perlindungan Anak','Dinas Pemberdayaan Perempuan dan Perlindungan Anak Provinsi Sulawesi Tengah','DP3A','Dinas',250),
('dispora','Dinas Pemuda dan Olahraga','Dinas Pemuda dan Olahraga Provinsi Sulawesi Tengah','Dispora','Dinas',260),
('dpmptsp','Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu','Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Provinsi Sulawesi Tengah','DPMPTSP','Dinas',270),
('pendidikan','Dinas Pendidikan','Dinas Pendidikan Provinsi Sulawesi Tengah','Disdik','Dinas',280),
('p2kb','Dinas Pengendalian Penduduk dan Keluarga Berencana','Dinas Pengendalian Penduduk dan Keluarga Berencana Provinsi Sulawesi Tengah','P2KB','Dinas',290),
('dishub','Dinas Perhubungan','Dinas Perhubungan Provinsi Sulawesi Tengah','Dishub','Dinas',300),
('perindag','Dinas Perindustrian dan Perdagangan','Dinas Perindustrian dan Perdagangan Provinsi Sulawesi Tengah','Disperindag','Dinas',310),
('disbunak','Dinas Perkebunan dan Peternakan','Dinas Perkebunan dan Peternakan Provinsi Sulawesi Tengah','Disbunak','Dinas',320),
('dispusaka','Dinas Perpustakaan dan Kearsipan','Dinas Perpustakaan dan Kearsipan Provinsi Sulawesi Tengah','Dispusaka','Dinas',330),
('perkimtan','Dinas Perumahan, Kawasan Permukiman dan Pertanahan','Dinas Perumahan, Kawasan Permukiman dan Pertanahan Provinsi Sulawesi Tengah','Perkimtan','Dinas',340),
('dinsos','Dinas Sosial','Dinas Sosial Provinsi Sulawesi Tengah','Dinsos','Dinas',350),
('tph','Dinas Tanaman Pangan dan Hortikultura','Dinas Tanaman Pangan dan Hortikultura Provinsi Sulawesi Tengah','TPH','Dinas',360),
('nakertrans','Dinas Tenaga Kerja dan Transmigrasi','Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah','Nakertrans','Dinas',370),
('inspektorat','Inspektorat Daerah','Inspektorat Daerah Provinsi Sulawesi Tengah',null,'Inspektorat',410),
('satpol-pp','Satuan Polisi Pamong Praja','Satuan Polisi Pamong Praja Provinsi Sulawesi Tengah','Satpol PP','Satuan',420),
('setda','Sekretariat Daerah','Sekretariat Daerah Provinsi Sulawesi Tengah','Setda','Sekretariat',430),
('setwan','Sekretariat DPRD','Sekretariat DPRD Provinsi Sulawesi Tengah','Setwan','Sekretariat',440),
('rsud-undata','RSUD Undata','UPT Rumah Sakit Umum Daerah Undata Provinsi Sulawesi Tengah','RSUD Undata','UPT',510),
('rsud-madani','RSUD Madani','UPT Rumah Sakit Umum Daerah Madani Provinsi Sulawesi Tengah','RSUD Madani','UPT',520)
on conflict (slug) do update set
  display_name=excluded.display_name,
  official_name=excluded.official_name,
  acronym=excluded.acronym,
  entity_type=excluded.entity_type,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

create index if not exists opd_master_active_sort_idx on public.opd_master(active,sort_order);
create index if not exists opd_aliases_opd_idx on public.opd_aliases(opd_id);


with aliases(slug,alias) as (
values
('bkd','Badan Kepegawaian Daerah (BKD) Provinsi Sulawesi Tengah'),('bkd','Badan Kepegawaian Daerah Provinsi Sulawesi Tengah'),('bkd','BKD'),
('kesbangpol','Badan Kesatuan Bangsa dan Politik (Kesbangpol) Provinsi Sulawesi Tengah'),('kesbangpol','Badan Kesatuan Bangsa dan Politik Provinsi Sulawesi Tengah'),('kesbangpol','Kesbangpol'),
('bpbd','BADAN PENANGGULANGAN BENCANA DAERAH'),('bpbd','Badan Penanggulangan Bencana Daerah (BPBD) Provinsi Sulawesi Tengah'),('bpbd','Badan Penanggulangan Bencana Daerah Provinsi Sulawesi Tengah'),('bpbd','BPBD'),
('bapenda','Bapenda'),('bapenda','BAPENDA'),('bapenda','Badan Pendapatan Daerah Provinsi Sulawesi Tengah'),
('bpkad','BPKAD Sulteng'),('bpkad','Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD) Provinsi Sulawesi Tengah'),('bpkad','Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Sulawesi Tengah'),
('bpsdm','BADAN PENGEMBANGAN SUMBER DAYA MANUSIA'),('bpsdm','Badan Pengembangan Sumber Daya Manusia (BPSDM) Provinsi Sulawesi Tengah'),('bpsdm','Badan Pengembangan Sumber Daya Manusia Provinsi Sulawesi Tengah'),
('badan-penghubung','Badan Penghubung Provinsi Sulawesi Tengah'),
('bappeda','BAPPEDA SULTENG'),('bappeda','Badan Perencanaan Pembangunan Daerah Provinsi Sulawesi Tengah'),
('brida','Badan Riset dan Inovasi Daerah (BRIDA) Provinsi Sulawesi Tengah'),('brida','Badan Riset dan Inovasi Daerah Provinsi Sulawesi Tengah'),
('bmpr','Dinas Bina Marga'),('bmpr','Dinas Bina Marga dan Penataan Ruang Provinsi Sulawesi Tengah'),
('cikasda','Dinas Cipta Karya dan Sumber Daya Air Provinsi Sulawesi Tengah'),
('dpmptsp','Dinas DPMPTSP'),('dpmptsp','Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Provinsi Sulawesi Tengah'),
('esdm','Dinas ESDM'),('esdm','Dinas Energi dan Sumber Daya Mineral Provinsi Sulawesi Tengah'),
('disbud','Dinas Kebudayaan Sulteng'),('disbud','Dinas Kebudayaan Provinsi Sulawesi Tengah'),
('kehutanan','Dinas Kehutanan  Provinsi Sulawesi Tengah'),('kehutanan','Dinas Kehutanan Provinsi Sulawesi Tengah'),
('dislutkan','Dinas Kelautan dan Perikanan'),('dislutkan','Dinas Kelautan dan Perikanan Provinsi Sulawesi Tengah'),
('disdukcapil','Dinas Kependudukan & Catatan Sipil'),('disdukcapil','Dinas Kependudukan dan Pencatatan Sipil Provinsi Sulawesi Tengah'),
('dinkes','Dinas Kesehatan Provinsi Sulteng'),('dinkes','Dinas Kesehatan Provinsi Sulawesi Tengah'),
('dkips','Dinas Kominfosaintik'),('dkips','DISKOMINFOSANTIK'),('dkips','Dinas Komunikasi, Informatika, Persandian dan Statistik Provinsi Sulawesi Tengah'),
('dkukm','Dinas Koperasi & UKM Sulawesi Tengah'),('dkukm','Dinas Koperasi dan UKM Provinsi Sulawesi Tengah'),
('dlh','Dinas Lingkungan Hidup'),('dlh','Dinas Lingkungan Hidup Prov. Sulteng'),('dlh','Dinas Lingkungan Hidup Provinsi Sulawesi Tengah'),
('dinas-pangan','Dinas Pangan Provinsi Sulawesi Tengah'),
('pariwisata','Dinas Pariwisata Sulawesi Tengah'),('pariwisata','Dinas Pariwisata Provinsi Sulawesi Tengah'),
('pmd','Dinas Pemberdayaan Masyarakat Desa'),('pmd','Dinas Pemberdayaan Masyarakat dan Desa Provinsi Sulawesi Tengah'),
('dp3a','Dinas Pemberdayaan Perempuan & Perlindungan Anak'),('dp3a','Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DP3A)'),('dp3a','Dinas Pemberdayaan Perempuan dan Perlindungan Anak Provinsi Sulawesi Tengah'),
('dispora','DISPORA'),('dispora','Dinas Pemuda dan Olahraga'),('dispora','Dinas Pemuda dan Olahraga Provinsi Sulawesi Tengah'),
('pendidikan','Dinas Pendidikan'),('pendidikan','DINAS PENDIDIKAN'),('pendidikan','Dinas Pendidikan Provinsi Sulawesi Tengah'),
('p2kb','Perangkat Daerah P2KB Provinsi Sulawesi Tengah'),('p2kb','Dinas P2KB'),('p2kb','Dinas Pengendalian Penduduk dan Keluarga Berencana (P2KB) Provinsi Sulawesi Tengah'),
('dishub','DISHUB'),('dishub','Dinas Perhubungan Sulteng'),('dishub','Dinas Perhubungan Provinsi Sulawesi Tengah'),
('perindag','DINAS PERINDUSTRIAN DAN PERDAGANGAN'),('perindag','Dinas Perindustrian dan Pergadangan Sulawesi Tengah (Disperindag)'),('perindag','Dinas Perindustrian dan Perdagangan Provinsi Sulawesi Tengah'),
('disbunak','DINAS PERKEBUNAN DAN PETERNAKAN'),('disbunak','Dinas Perkebunan dan Peternakan Provinsi Sulawesi Tengah'),
('dispusaka','DINAS PERPUSTAKAAN DAN KEARSIPAN'),('dispusaka','Dinas Perpustakaan dan Kearsipan Daerah Provinsi Sulawesi Tengah'),
('perkimtan','Dinas Perumahan, Kawasan Permukiman dan Pertanahan Provinsi Sulawesi Tengah'),
('dinsos','DINAS SOSIAL'),('dinsos','Dinas Sosial Provinsi Sulawesi Tengah'),
('tph','Dinas TPH'),('tph','Dinas Tanaman Pangan dan Hortikultura Provinsi Sulawesi Tengah'),
('nakertrans','Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah'),
('inspektorat','Inspektorat Daerah Provinsi Sulawesi Tengah'),
('satpol-pp','Satuan Polisi Pamong Praja Provinsi Sulawesi Tengah'),
('setda','Sekretariat Daerah Provinsi Sulawesi Tengah'),
('setwan','Sekretariat DPRD'),('setwan','Sekretariat DPRD Provinsi Sulawesi Tengah'),
('rsud-undata','RSUD Undata'),('rsud-madani','RSUD Madani')
)
insert into public.opd_aliases(opd_id,alias)
select m.id,a.alias from aliases a join public.opd_master m on m.slug=a.slug
on conflict (alias_normalized) do nothing;
