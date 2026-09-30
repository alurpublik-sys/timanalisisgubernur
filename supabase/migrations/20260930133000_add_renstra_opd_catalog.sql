
create table if not exists public.renstra_opd (
  id bigint generated always as identity primary key,
  slug text not null unique,
  opd_name text not null,
  short_name text not null,
  period_label text,
  period_start integer,
  period_end integer,
  source_kind text not null check (source_kind in ('pdf','word','folder','mixed')),
  source_title text not null,
  source_url text not null,
  source_drive_id text,
  aliases text[] not null default '{}'::text[],
  document_count integer not null default 1 check (document_count >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.renstra_documents (
  id bigint generated always as identity primary key,
  renstra_opd_id bigint not null references public.renstra_opd(id) on delete cascade,
  title text not null,
  source_url text not null,
  drive_file_id text unique,
  mime_type text not null,
  file_size bigint,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists renstra_opd_active_sort_idx on public.renstra_opd(active, sort_order, opd_name);
create index if not exists renstra_documents_opd_sort_idx on public.renstra_documents(renstra_opd_id, sort_order, id);

alter table public.renstra_opd enable row level security;
alter table public.renstra_documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='renstra_opd' and policyname='Public can read active renstra catalog') then
    create policy "Public can read active renstra catalog" on public.renstra_opd for select using (active = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='renstra_documents' and policyname='Public can read renstra documents') then
    create policy "Public can read renstra documents" on public.renstra_documents for select using (
      exists (select 1 from public.renstra_opd r where r.id = renstra_opd_id and r.active = true)
    );
  end if;
end $$;

grant select on public.renstra_opd to anon, authenticated;
grant select on public.renstra_documents to anon, authenticated;

insert into public.renstra_opd
(slug,opd_name,short_name,period_label,period_start,period_end,source_kind,source_title,source_url,source_drive_id,aliases,document_count,sort_order)
values
('bapenda','Badan Pendapatan Daerah Provinsi Sulawesi Tengah','BAPENDA','2025–2029',2025,2029,'folder','RENSTRA BAPENDA 2025-2029','https://drive.google.com/drive/folders/1YCUeI6wXcwkGoLiI7-iv-yFYQyOf77uu','1YCUeI6wXcwkGoLiI7-iv-yFYQyOf77uu',ARRAY['Bapenda','BAPENDA']::text[],11,1),
('dinkes','Dinas Kesehatan Provinsi Sulawesi Tengah','DINKES','2025–2029',2025,2029,'pdf','RENSTRA DINKES 2025-2029.pdf','https://drive.google.com/file/d/1mkR15_-FIkU1P0z8eySCXvUqlXeb-gDz/view?usp=drivesdk','1mkR15_-FIkU1P0z8eySCXvUqlXeb-gDz',ARRAY['Dinas Kesehatan Provinsi Sulawesi Tengah']::text[],1,2),
('dinsos','Dinas Sosial Provinsi Sulawesi Tengah','DINSOS','2025–2029',2025,2029,'pdf','RENSTRA DINSOS-2025-2029.pdf','https://drive.google.com/file/d/1kNXxVQ7ZEt5Pb6KDXknTkaGIOunIWB0c/view?usp=drivesdk','1kNXxVQ7ZEt5Pb6KDXknTkaGIOunIWB0c',ARRAY['DINAS SOSIAL','Dinas Sosial Provinsi Sulawesi Tengah']::text[],1,3),
('inspektorat','Inspektorat Daerah Provinsi Sulawesi Tengah','INSPEKTORAT','2025–2029',2025,2029,'pdf','RENSTRA INSPEKTORAT DAERAH TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1ilhLdtN1UOjP0jPmEfBjM4brtHYdqQJx/view?usp=drivesdk','1ilhLdtN1UOjP0jPmEfBjM4brtHYdqQJx',ARRAY[]::text[],1,4),
('nakertrans','Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah','NAKERTRANS','2025–2029',2025,2029,'pdf','RENSTRA NAKERTRANS 2025 - 2029 FIX AKHIR .pdf','https://drive.google.com/file/d/1rYcoOoRFZoA7HXZDW86g8ob_zMksQ9V5/view?usp=drivesdk','1rYcoOoRFZoA7HXZDW86g8ob_zMksQ9V5',ARRAY[]::text[],1,5),
('perindag','Dinas Perindustrian dan Perdagangan Provinsi Sulawesi Tengah','PERINDAG','2025–2029',2025,2029,'pdf','RENSTRA PERINDAG 2025-2029 (TTD Vers) rv2.pdf','https://drive.google.com/file/d/19YZS1gRGaNP1pRcEwJOtUIJyQejHn01W/view?usp=drivesdk','19YZS1gRGaNP1pRcEwJOtUIJyQejHn01W',ARRAY['DINAS PERINDUSTRIAN DAN PERDAGANGAN','Dinas Perindustrian dan Pergadangan Sulawesi Tengah (Disperindag)']::text[],1,6),
('satpol-pp','Satuan Polisi Pamong Praja Provinsi Sulawesi Tengah','SATPOL PP',null,null,null,'pdf','Renstra Satpol PP.pdf','https://drive.google.com/file/d/1kvC4bhuE9m_hRTDvm86dNhFkWNX5xxwZ/view?usp=drivesdk','1kvC4bhuE9m_hRTDvm86dNhFkWNX5xxwZ',ARRAY[]::text[],1,7),
('setda','Sekretariat Daerah Provinsi Sulawesi Tengah','SETDA','2025–2029',2025,2029,'pdf','RENSTRA SETDA 2025-2029.pdf','https://drive.google.com/file/d/1hArE4cf2YiULEiyDaJym81WP5mw3-kfA/view?usp=drivesdk','1hArE4cf2YiULEiyDaJym81WP5mw3-kfA',ARRAY[]::text[],1,8),
('dinas-pangan','Dinas Pangan Provinsi Sulawesi Tengah','DINAS PANGAN','2025–2029',2025,2029,'pdf','RENSTRA DINAS PANGAN 2025-2029 ok1.pdf','https://drive.google.com/file/d/1gt1dNPMfY-Juqzga4005abjqj2V4kdYv/view?usp=drivesdk','1gt1dNPMfY-Juqzga4005abjqj2V4kdYv',ARRAY[]::text[],1,9),
('pariwisata','Dinas Pariwisata Provinsi Sulawesi Tengah','PARIWISATA','2025–2029',2025,2029,'pdf','RENSTRA DINAS PARIWISATA 2025-2029.pdf','https://drive.google.com/file/d/1pVN94xZh9ySBqjcZu2cqIw34SJB4SGF3/view?usp=drivesdk','1pVN94xZh9ySBqjcZu2cqIw34SJB4SGF3',ARRAY['Dinas Pariwisata Sulawesi Tengah']::text[],1,10),
('pmd','Dinas Pemberdayaan Masyarakat dan Desa Provinsi Sulawesi Tengah','PMD','2025–2029',2025,2029,'pdf','RENSTRA DINAS PMD 2025-2029.pdf','https://drive.google.com/file/d/15xzUyhybW0ZEleLVp6-HeAY7Le8yNAv6/view?usp=drivesdk','15xzUyhybW0ZEleLVp6-HeAY7Le8yNAv6',ARRAY['Dinas Pemberdayaan Masyarakat Desa']::text[],1,11),
('tph','Dinas Tanaman Pangan dan Hortikultura Provinsi Sulawesi Tengah','TPH','2025–2029',2025,2029,'pdf','RENSTRA DINAS TPH SULTENG 2025-2029.pdf','https://drive.google.com/file/d/1c1djBdz2aRSfDmdYCrrXbUMqpJB0R0wF/view?usp=drivesdk','1c1djBdz2aRSfDmdYCrrXbUMqpJB0R0wF',ARRAY['Dinas TPH','Dinas TPH ']::text[],1,12),
('disbunak','Dinas Perkebunan dan Peternakan Provinsi Sulawesi Tengah','DISBUNAK','2025–2029',2025,2029,'pdf','RENSTRA DISBUNAK TAHUN 2025-2029 14 11 2025.pdf','https://drive.google.com/file/d/17xZwusI6cPMbFy8WlQT0wVMAwTkO7u1r/view?usp=drivesdk','17xZwusI6cPMbFy8WlQT0wVMAwTkO7u1r',ARRAY['DINAS PERKEBUNAN DAN PETERNAKAN','Dinas Perkebunan dan Peternakan Provinsi Sulawesi Tengah']::text[],1,13),
('dishub','Dinas Perhubungan Provinsi Sulawesi Tengah','DISHUB','2025–2029',2025,2029,'pdf','RENSTRA DISHUB TA. 2025 - 2029 UPDATE.pdf','https://drive.google.com/file/d/1LYRYWbbGt7CQJCl2Pp5Ub6tp_Ii3dUf9/view?usp=drivesdk','1LYRYWbbGt7CQJCl2Pp5Ub6tp_Ii3dUf9',ARRAY['DISHUB','Dinas Perhubungan Sulteng']::text[],1,14),
('dispora','Dinas Pemuda dan Olahraga Provinsi Sulawesi Tengah','DISPORA','2025–2029',2025,2029,'pdf','RENSTRA DISPORA TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1InjIvs4wKCHzoRK4i3Pv8xBILSMDIeGO/view?usp=drivesdk','1InjIvs4wKCHzoRK4i3Pv8xBILSMDIeGO',ARRAY['DISPORA','Dinas Pemuda dan Olahraga']::text[],1,15),
('dkips','Dinas Komunikasi, Informatika, Persandian dan Statistik Provinsi Sulawesi Tengah','DKIPS','2025–2029',2025,2029,'pdf','RENSTRA DKIPS 2025-2029 (RANHIR).pdf','https://drive.google.com/file/d/1n6o_Lo0FrepwpNP6f6pMAajrcddgfwVu/view?usp=drivesdk','1n6o_Lo0FrepwpNP6f6pMAajrcddgfwVu',ARRAY['Dinas Kominfosaintik','DISKOMINFOSANTIK']::text[],1,16),
('dp3a','Dinas Pemberdayaan Perempuan dan Perlindungan Anak Provinsi Sulawesi Tengah','DP3A','2025–2029',2025,2029,'word','RENSTRA DP3A 2025 - 2029 (I 21 Nov 2025)(1).docx','https://docs.google.com/document/d/1rNyKxQTuj9onNIh3pUTBZQ_9z9nYQ6OP/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1rNyKxQTuj9onNIh3pUTBZQ_9z9nYQ6OP',ARRAY['Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DP3A)']::text[],1,17),
('dpmptsp','Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Provinsi Sulawesi Tengah','DPMPTSP','2025–2029',2025,2029,'pdf','RENSTRA DPMPTSP 2025-2029_NET_Nov.pdf','https://drive.google.com/file/d/1_x4DVqvNPiweU7KMpIUxEhMbTbC3iOxC/view?usp=drivesdk','1_x4DVqvNPiweU7KMpIUxEhMbTbC3iOxC',ARRAY['Dinas DPMPTSP']::text[],1,18),
('kehutanan','Dinas Kehutanan Provinsi Sulawesi Tengah','KEHUTANAN',null,null,null,'pdf','DINAS KEHUTANAN - RENSTRA.pdf','https://drive.google.com/file/d/1lXpi_blHknEMxHJr8aT8abWze_eYdF30/view?usp=drivesdk','1lXpi_blHknEMxHJr8aT8abWze_eYdF30',ARRAY[]::text[],1,19),
('brida','Badan Riset dan Inovasi Daerah Provinsi Sulawesi Tengah','BRIDA','2025–2029',2025,2029,'pdf','RENSRA BRIDA 2025-2029.pdf','https://drive.google.com/file/d/1u89skVvKGHgun3NkkyvmEGk-dG67GjyR/view?usp=drivesdk','1u89skVvKGHgun3NkkyvmEGk-dG67GjyR',ARRAY['Badan Riset dan Inovasi Daerah (BRIDA) Provinsi Sulawesi Tengah']::text[],1,20),
('pendidikan','Dinas Pendidikan Provinsi Sulawesi Tengah','PENDIDIKAN','2025–2029',2025,2029,'pdf','Renstra 25-29 Dinas Pendidikan 111125.pdf','https://drive.google.com/file/d/1uouG24N5b3oxM_GzmWHJBloYqTuoMJ62/view?usp=drivesdk','1uouG24N5b3oxM_GzmWHJBloYqTuoMJ62',ARRAY['Dinas Pendidikan','DINAS PENDIDIKAN','Dinas Pendidikan Provinsi Sulawesi Tengah']::text[],1,21),
('bpsdm','Badan Pengembangan Sumber Daya Manusia Provinsi Sulawesi Tengah','BPSDM','2025–2029',2025,2029,'pdf','Renstra 2025-2029 BPSDM.pdf','https://drive.google.com/file/d/1h-MoGAf4t68aUqbctXIttwDEWBsvLGwv/view?usp=drivesdk','1h-MoGAf4t68aUqbctXIttwDEWBsvLGwv',ARRAY['BADAN PENGEMBANGAN SUMBER DAYA MANUSIA','Badan Pengembangan Sumber Daya Manusia (BPSDM) Provinsi Sulawesi Tengah']::text[],1,22),
('perkimtan','Dinas Perumahan, Kawasan Permukiman dan Pertanahan Provinsi Sulawesi Tengah','PERKIMTAN','2025–2029',2025,2029,'pdf','RENSTRA 2025-2029 DINAS PERUMAHAN KAWASAN EPRUMAHAN DAN PERTANAHAN.pdf','https://drive.google.com/file/d/1MpY_XH9KMK4gRG-Co2uv1BUDkFI5ZLaD/view?usp=drivesdk','1MpY_XH9KMK4gRG-Co2uv1BUDkFI5ZLaD',ARRAY[]::text[],1,23),
('disbud','Dinas Kebudayaan Provinsi Sulawesi Tengah','DISBUD','2025–2029',2025,2029,'pdf','RENSTRA 2025-2029 DISBUD REVIUW.pdf','https://drive.google.com/file/d/1ZyEtttntEt6WPFrUxKh7r9U5yO-FYjLA/view?usp=drivesdk','1ZyEtttntEt6WPFrUxKh7r9U5yO-FYjLA',ARRAY[]::text[],1,24),
('p2kb','Perangkat Daerah P2KB Provinsi Sulawesi Tengah','P2KB','2025–2029',2025,2029,'pdf','RENSTRA 2025-2029 P2KB (cetak).pdf','https://drive.google.com/file/d/1BMB0z_yIvjHOuOPGWBibFjUpCQuTQxRC/view?usp=drivesdk','1BMB0z_yIvjHOuOPGWBibFjUpCQuTQxRC',ARRAY[]::text[],1,25),
('badan-penghubung','Badan Penghubung Provinsi Sulawesi Tengah','BADAN PENGHUBUNG','2025–2029',2025,2029,'pdf','Renstra Badan Penghubung 2025-2029.pdf','https://drive.google.com/file/d/1q7TekTcQ0KGUQnswBR8xczTMeJPFq_UE/view?usp=drivesdk','1q7TekTcQ0KGUQnswBR8xczTMeJPFq_UE',ARRAY[]::text[],1,26),
('bappeda','Badan Perencanaan Pembangunan Daerah Provinsi Sulawesi Tengah','BAPPEDA','2025–2029',2025,2029,'pdf','RENSTRA BAPPEDA TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1ps6i1t6uxUronTqL9BC6-KSwvh_FXXMH/view?usp=drivesdk','1ps6i1t6uxUronTqL9BC6-KSwvh_FXXMH',ARRAY['BAPPEDA SULTENG']::text[],1,27),
('bkd','Badan Kepegawaian Daerah Provinsi Sulawesi Tengah','BKD',null,null,null,'pdf','RENSTRA BKD FIX.pdf','https://drive.google.com/file/d/1VJth73pLNvH2gcxgKU9GFk9Tc6Vj9BZy/view?usp=drivesdk','1VJth73pLNvH2gcxgKU9GFk9Tc6Vj9BZy',ARRAY['Badan Kepegawaian Daerah (BKD) Provinsi Sulawesi Tengah']::text[],1,28),
('bpbd','Badan Penanggulangan Bencana Daerah Provinsi Sulawesi Tengah','BPBD','2025–2029',2025,2029,'pdf','renstra bpbd 2025-2029 .pdf','https://drive.google.com/file/d/1AWhqrehqFVmzJf9mWy2biSrz3y7KM6zF/view?usp=drivesdk','1AWhqrehqFVmzJf9mWy2biSrz3y7KM6zF',ARRAY['BADAN PENANGGULANGAN BENCANA DAERAH','Badan Penanggulangan Bencana Daerah (BPBD) Provinsi Sulawesi Tengah']::text[],1,29),
('bpkad','Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Sulawesi Tengah','BPKAD','2025–2029',2025,2029,'pdf','RENSTRA BPKAD 2025-2029.pdf','https://drive.google.com/file/d/1SDP0HgSsPSOp1Gje1VwjVbE25HB7vCOz/view?usp=drivesdk','1SDP0HgSsPSOp1Gje1VwjVbE25HB7vCOz',ARRAY['Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD) Provinsi Sulawesi Tengah','BPKAD Sulteng']::text[],1,30),
('cikasda','Dinas Cipta Karya dan Sumber Daya Air Provinsi Sulawesi Tengah','CIKASDA','2025–2029',2025,2029,'pdf','Renstra Cikasda 2025-2029.pdf','https://drive.google.com/file/d/1ee3LVjXGlhO6JhB826i63X8vP_ybK4Ei/view?usp=drivesdk','1ee3LVjXGlhO6JhB826i63X8vP_ybK4Ei',ARRAY[]::text[],1,31),
('esdm','Dinas Energi dan Sumber Daya Mineral Provinsi Sulawesi Tengah','ESDM','2025–2029',2025,2029,'pdf','RENSTRA DESDM 2025 - 2029 REVISI IKU.pdf','https://drive.google.com/file/d/1RYWJpeD-FskBQUlmT8Zpb1t3CtlnirEa/view?usp=drivesdk','1RYWJpeD-FskBQUlmT8Zpb1t3CtlnirEa',ARRAY['Dinas ESDM']::text[],1,32),
('dispusaka','Dinas Perpustakaan dan Kearsipan Daerah Provinsi Sulawesi Tengah','DISPUSAKA','2025–2029',2025,2029,'word','(8 OKT 25 ) RENSTRA DISPUSADA THN 2025-2029(1).docx','https://docs.google.com/document/d/1r2Xqqn8dsU40vr9FauUvTj6wsRyP4sUW/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1r2Xqqn8dsU40vr9FauUvTj6wsRyP4sUW',ARRAY['DINAS PERPUSTAKAAN DAN KEARSIPAN','Dinas Perpustakaan dan Kearsipan Daerah Provinsi Sulawesi Tengah']::text[],1,33),
('disdukcapil','Dinas Kependudukan dan Pencatatan Sipil Provinsi Sulawesi Tengah','DISDUKCAPIL','2025–2030',2025,2030,'pdf','DISDUKCAPIL SULTENG - RENSTRA 2025 - 2030.pdf','https://drive.google.com/file/d/1n8maJSLl8AV7yc4_EC4vYZ2ZFjFbm2xE/view?usp=drivesdk','1n8maJSLl8AV7yc4_EC4vYZ2ZFjFbm2xE',ARRAY[]::text[],1,34),
('bmpr','Dinas Bina Marga dan Penataan Ruang Provinsi Sulawesi Tengah','BMPR','2026–2039',2026,2039,'pdf','RANHIR renstra BMPR 2026-2039 Edited Oct 2025 - Added Inmen, Kepmen & PerGub.pdf','https://drive.google.com/file/d/1AbkYCSJUmnariHlv8R_k5_jp-6a-Q0nf/view?usp=drivesdk','1AbkYCSJUmnariHlv8R_k5_jp-6a-Q0nf',ARRAY['Dinas Bina Marga']::text[],1,35),
('dislutkan','Dinas Kelautan dan Perikanan Provinsi Sulawesi Tengah','DISLUTKAN','2025–2029',2025,2029,'pdf','RANHIR RENSTRA DISLUTKAN 2025-2029 FINAL.pdf','https://drive.google.com/file/d/1zu3NBm95R_g3f67O6cebRAlXSv2dsGLV/view?usp=drivesdk','1zu3NBm95R_g3f67O6cebRAlXSv2dsGLV',ARRAY['Dinas Kelautan dan Perikanan']::text[],1,36),
('dlh','Dinas Lingkungan Hidup Provinsi Sulawesi Tengah','DLH','2025–2029',2025,2029,'pdf','RANHIR RENSTRA DLH 2025-2029.pdf','https://drive.google.com/file/d/10ZRTZoDuYYQXoNTYS3SKuPyc5L5eBZyQ/view?usp=drivesdk','10ZRTZoDuYYQXoNTYS3SKuPyc5L5eBZyQ',ARRAY['Dinas Lingkungan Hidup','Dinas Lingkungan Hidup Prov. Sulteng']::text[],1,37),
('dkukm','Dinas Koperasi dan UKM Provinsi Sulawesi Tengah','DKUKM','2025–2029',2025,2029,'pdf','Rankhir Renstra DKUKM 2025-2029(1).pdf','https://drive.google.com/file/d/1ulSOCCqXjEq3E4B8Fe9KiqNFWvhrXkCR/view?usp=drivesdk','1ulSOCCqXjEq3E4B8Fe9KiqNFWvhrXkCR',ARRAY[]::text[],1,38),
('setwan','Sekretariat DPRD Provinsi Sulawesi Tengah','SETWAN','2025–2029',2025,2029,'pdf','RENSTRA SETWAN 2025-2029 OKE(1).pdf','https://drive.google.com/file/d/1QOSMg4VEcLRaVODOFoy6r2FvTPKl2kEq/view?usp=drivesdk','1QOSMg4VEcLRaVODOFoy6r2FvTPKl2kEq',ARRAY[]::text[],1,39)
on conflict (slug) do update set
  opd_name=excluded.opd_name,
  short_name=excluded.short_name,
  period_label=excluded.period_label,
  period_start=excluded.period_start,
  period_end=excluded.period_end,
  source_kind=excluded.source_kind,
  source_title=excluded.source_title,
  source_url=excluded.source_url,
  source_drive_id=excluded.source_drive_id,
  aliases=excluded.aliases,
  document_count=excluded.document_count,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

insert into public.renstra_documents
(renstra_opd_id,title,source_url,drive_file_id,mime_type,file_size,is_primary,sort_order)
values
((select id from public.renstra_opd where slug='dinkes'),'RENSTRA DINKES 2025-2029.pdf','https://drive.google.com/file/d/1mkR15_-FIkU1P0z8eySCXvUqlXeb-gDz/view?usp=drivesdk','1mkR15_-FIkU1P0z8eySCXvUqlXeb-gDz','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dinsos'),'RENSTRA DINSOS-2025-2029.pdf','https://drive.google.com/file/d/1kNXxVQ7ZEt5Pb6KDXknTkaGIOunIWB0c/view?usp=drivesdk','1kNXxVQ7ZEt5Pb6KDXknTkaGIOunIWB0c','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='inspektorat'),'RENSTRA INSPEKTORAT DAERAH TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1ilhLdtN1UOjP0jPmEfBjM4brtHYdqQJx/view?usp=drivesdk','1ilhLdtN1UOjP0jPmEfBjM4brtHYdqQJx','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='nakertrans'),'RENSTRA NAKERTRANS 2025 - 2029 FIX AKHIR .pdf','https://drive.google.com/file/d/1rYcoOoRFZoA7HXZDW86g8ob_zMksQ9V5/view?usp=drivesdk','1rYcoOoRFZoA7HXZDW86g8ob_zMksQ9V5','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='perindag'),'RENSTRA PERINDAG 2025-2029 (TTD Vers) rv2.pdf','https://drive.google.com/file/d/19YZS1gRGaNP1pRcEwJOtUIJyQejHn01W/view?usp=drivesdk','19YZS1gRGaNP1pRcEwJOtUIJyQejHn01W','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='satpol-pp'),'Renstra Satpol PP.pdf','https://drive.google.com/file/d/1kvC4bhuE9m_hRTDvm86dNhFkWNX5xxwZ/view?usp=drivesdk','1kvC4bhuE9m_hRTDvm86dNhFkWNX5xxwZ','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='setda'),'RENSTRA SETDA 2025-2029.pdf','https://drive.google.com/file/d/1hArE4cf2YiULEiyDaJym81WP5mw3-kfA/view?usp=drivesdk','1hArE4cf2YiULEiyDaJym81WP5mw3-kfA','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dinas-pangan'),'RENSTRA DINAS PANGAN 2025-2029 ok1.pdf','https://drive.google.com/file/d/1gt1dNPMfY-Juqzga4005abjqj2V4kdYv/view?usp=drivesdk','1gt1dNPMfY-Juqzga4005abjqj2V4kdYv','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='pariwisata'),'RENSTRA DINAS PARIWISATA 2025-2029.pdf','https://drive.google.com/file/d/1pVN94xZh9ySBqjcZu2cqIw34SJB4SGF3/view?usp=drivesdk','1pVN94xZh9ySBqjcZu2cqIw34SJB4SGF3','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='pmd'),'RENSTRA DINAS PMD 2025-2029.pdf','https://drive.google.com/file/d/15xzUyhybW0ZEleLVp6-HeAY7Le8yNAv6/view?usp=drivesdk','15xzUyhybW0ZEleLVp6-HeAY7Le8yNAv6','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='tph'),'RENSTRA DINAS TPH SULTENG 2025-2029.pdf','https://drive.google.com/file/d/1c1djBdz2aRSfDmdYCrrXbUMqpJB0R0wF/view?usp=drivesdk','1c1djBdz2aRSfDmdYCrrXbUMqpJB0R0wF','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='disbunak'),'RENSTRA DISBUNAK TAHUN 2025-2029 14 11 2025.pdf','https://drive.google.com/file/d/17xZwusI6cPMbFy8WlQT0wVMAwTkO7u1r/view?usp=drivesdk','17xZwusI6cPMbFy8WlQT0wVMAwTkO7u1r','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dishub'),'RENSTRA DISHUB TA. 2025 - 2029 UPDATE.pdf','https://drive.google.com/file/d/1LYRYWbbGt7CQJCl2Pp5Ub6tp_Ii3dUf9/view?usp=drivesdk','1LYRYWbbGt7CQJCl2Pp5Ub6tp_Ii3dUf9','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dispora'),'RENSTRA DISPORA TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1InjIvs4wKCHzoRK4i3Pv8xBILSMDIeGO/view?usp=drivesdk','1InjIvs4wKCHzoRK4i3Pv8xBILSMDIeGO','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dkips'),'RENSTRA DKIPS 2025-2029 (RANHIR).pdf','https://drive.google.com/file/d/1n6o_Lo0FrepwpNP6f6pMAajrcddgfwVu/view?usp=drivesdk','1n6o_Lo0FrepwpNP6f6pMAajrcddgfwVu','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dp3a'),'RENSTRA DP3A 2025 - 2029 (I 21 Nov 2025)(1).docx','https://docs.google.com/document/d/1rNyKxQTuj9onNIh3pUTBZQ_9z9nYQ6OP/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1rNyKxQTuj9onNIh3pUTBZQ_9z9nYQ6OP','application/vnd.openxmlformats-officedocument.wordprocessingml.document',null,true,1),
((select id from public.renstra_opd where slug='dpmptsp'),'RENSTRA DPMPTSP 2025-2029_NET_Nov.pdf','https://drive.google.com/file/d/1_x4DVqvNPiweU7KMpIUxEhMbTbC3iOxC/view?usp=drivesdk','1_x4DVqvNPiweU7KMpIUxEhMbTbC3iOxC','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='kehutanan'),'DINAS KEHUTANAN - RENSTRA.pdf','https://drive.google.com/file/d/1lXpi_blHknEMxHJr8aT8abWze_eYdF30/view?usp=drivesdk','1lXpi_blHknEMxHJr8aT8abWze_eYdF30','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='brida'),'RENSRA BRIDA 2025-2029.pdf','https://drive.google.com/file/d/1u89skVvKGHgun3NkkyvmEGk-dG67GjyR/view?usp=drivesdk','1u89skVvKGHgun3NkkyvmEGk-dG67GjyR','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='pendidikan'),'Renstra 25-29 Dinas Pendidikan 111125.pdf','https://drive.google.com/file/d/1uouG24N5b3oxM_GzmWHJBloYqTuoMJ62/view?usp=drivesdk','1uouG24N5b3oxM_GzmWHJBloYqTuoMJ62','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bpsdm'),'Renstra 2025-2029 BPSDM.pdf','https://drive.google.com/file/d/1h-MoGAf4t68aUqbctXIttwDEWBsvLGwv/view?usp=drivesdk','1h-MoGAf4t68aUqbctXIttwDEWBsvLGwv','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='perkimtan'),'RENSTRA 2025-2029 DINAS PERUMAHAN KAWASAN EPRUMAHAN DAN PERTANAHAN.pdf','https://drive.google.com/file/d/1MpY_XH9KMK4gRG-Co2uv1BUDkFI5ZLaD/view?usp=drivesdk','1MpY_XH9KMK4gRG-Co2uv1BUDkFI5ZLaD','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='disbud'),'RENSTRA 2025-2029 DISBUD REVIUW.pdf','https://drive.google.com/file/d/1ZyEtttntEt6WPFrUxKh7r9U5yO-FYjLA/view?usp=drivesdk','1ZyEtttntEt6WPFrUxKh7r9U5yO-FYjLA','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='p2kb'),'RENSTRA 2025-2029 P2KB (cetak).pdf','https://drive.google.com/file/d/1BMB0z_yIvjHOuOPGWBibFjUpCQuTQxRC/view?usp=drivesdk','1BMB0z_yIvjHOuOPGWBibFjUpCQuTQxRC','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='badan-penghubung'),'Renstra Badan Penghubung 2025-2029.pdf','https://drive.google.com/file/d/1q7TekTcQ0KGUQnswBR8xczTMeJPFq_UE/view?usp=drivesdk','1q7TekTcQ0KGUQnswBR8xczTMeJPFq_UE','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bappeda'),'RENSTRA BAPPEDA TAHUN 2025-2029.pdf','https://drive.google.com/file/d/1ps6i1t6uxUronTqL9BC6-KSwvh_FXXMH/view?usp=drivesdk','1ps6i1t6uxUronTqL9BC6-KSwvh_FXXMH','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bkd'),'RENSTRA BKD FIX.pdf','https://drive.google.com/file/d/1VJth73pLNvH2gcxgKU9GFk9Tc6Vj9BZy/view?usp=drivesdk','1VJth73pLNvH2gcxgKU9GFk9Tc6Vj9BZy','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bpbd'),'renstra bpbd 2025-2029 .pdf','https://drive.google.com/file/d/1AWhqrehqFVmzJf9mWy2biSrz3y7KM6zF/view?usp=drivesdk','1AWhqrehqFVmzJf9mWy2biSrz3y7KM6zF','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bpkad'),'RENSTRA BPKAD 2025-2029.pdf','https://drive.google.com/file/d/1SDP0HgSsPSOp1Gje1VwjVbE25HB7vCOz/view?usp=drivesdk','1SDP0HgSsPSOp1Gje1VwjVbE25HB7vCOz','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='cikasda'),'Renstra Cikasda 2025-2029.pdf','https://drive.google.com/file/d/1ee3LVjXGlhO6JhB826i63X8vP_ybK4Ei/view?usp=drivesdk','1ee3LVjXGlhO6JhB826i63X8vP_ybK4Ei','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='esdm'),'RENSTRA DESDM 2025 - 2029 REVISI IKU.pdf','https://drive.google.com/file/d/1RYWJpeD-FskBQUlmT8Zpb1t3CtlnirEa/view?usp=drivesdk','1RYWJpeD-FskBQUlmT8Zpb1t3CtlnirEa','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dispusaka'),'(8 OKT 25 ) RENSTRA DISPUSADA THN 2025-2029(1).docx','https://docs.google.com/document/d/1r2Xqqn8dsU40vr9FauUvTj6wsRyP4sUW/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1r2Xqqn8dsU40vr9FauUvTj6wsRyP4sUW','application/vnd.openxmlformats-officedocument.wordprocessingml.document',null,true,1),
((select id from public.renstra_opd where slug='disdukcapil'),'DISDUKCAPIL SULTENG - RENSTRA 2025 - 2030.pdf','https://drive.google.com/file/d/1n8maJSLl8AV7yc4_EC4vYZ2ZFjFbm2xE/view?usp=drivesdk','1n8maJSLl8AV7yc4_EC4vYZ2ZFjFbm2xE','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bmpr'),'RANHIR renstra BMPR 2026-2039 Edited Oct 2025 - Added Inmen, Kepmen & PerGub.pdf','https://drive.google.com/file/d/1AbkYCSJUmnariHlv8R_k5_jp-6a-Q0nf/view?usp=drivesdk','1AbkYCSJUmnariHlv8R_k5_jp-6a-Q0nf','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dislutkan'),'RANHIR RENSTRA DISLUTKAN 2025-2029 FINAL.pdf','https://drive.google.com/file/d/1zu3NBm95R_g3f67O6cebRAlXSv2dsGLV/view?usp=drivesdk','1zu3NBm95R_g3f67O6cebRAlXSv2dsGLV','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dlh'),'RANHIR RENSTRA DLH 2025-2029.pdf','https://drive.google.com/file/d/10ZRTZoDuYYQXoNTYS3SKuPyc5L5eBZyQ/view?usp=drivesdk','10ZRTZoDuYYQXoNTYS3SKuPyc5L5eBZyQ','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='dkukm'),'Rankhir Renstra DKUKM 2025-2029(1).pdf','https://drive.google.com/file/d/1ulSOCCqXjEq3E4B8Fe9KiqNFWvhrXkCR/view?usp=drivesdk','1ulSOCCqXjEq3E4B8Fe9KiqNFWvhrXkCR','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='setwan'),'RENSTRA SETWAN 2025-2029 OKE(1).pdf','https://drive.google.com/file/d/1QOSMg4VEcLRaVODOFoy6r2FvTPKl2kEq/view?usp=drivesdk','1QOSMg4VEcLRaVODOFoy6r2FvTPKl2kEq','application/pdf',null,true,1),
((select id from public.renstra_opd where slug='bapenda'),'BAB I.docx','https://docs.google.com/document/d/1vAlOiOjUsPrNhdXNFWbCcucD5ugO72RI/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1vAlOiOjUsPrNhdXNFWbCcucD5ugO72RI','application/vnd.openxmlformats-officedocument.wordprocessingml.document',28184,true,10),
((select id from public.renstra_opd where slug='bapenda'),'BAB II.docx','https://docs.google.com/document/d/1a_wuHrPcQ6vbpr5igejtudKZ73cZvzlh/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1a_wuHrPcQ6vbpr5igejtudKZ73cZvzlh','application/vnd.openxmlformats-officedocument.wordprocessingml.document',634495,false,20),
((select id from public.renstra_opd where slug='bapenda'),'BAB III.docx','https://docs.google.com/document/d/1dkMkBJqmej9aDnMPdED7YSXe-YYFr5xg/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1dkMkBJqmej9aDnMPdED7YSXe-YYFr5xg','application/vnd.openxmlformats-officedocument.wordprocessingml.document',599446,false,30),
((select id from public.renstra_opd where slug='bapenda'),'BAB IV.docx','https://docs.google.com/document/d/144r4PldZdh_Ga4kVfNb1VjfZcd2sHCTZ/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','144r4PldZdh_Ga4kVfNb1VjfZcd2sHCTZ','application/vnd.openxmlformats-officedocument.wordprocessingml.document',706157,false,40),
((select id from public.renstra_opd where slug='bapenda'),'BAB V.docx','https://docs.google.com/document/d/1tqHJ05ulCWoOrm1pwYJ2g5Dlygp7sELk/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1tqHJ05ulCWoOrm1pwYJ2g5Dlygp7sELk','application/vnd.openxmlformats-officedocument.wordprocessingml.document',20629,false,50),
((select id from public.renstra_opd where slug='bapenda'),'1. Cover Renstra 2025.docx','https://docs.google.com/document/d/1b8wdOc_7FApZ_yGqb_FDUzIOIWeEo6rV/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1b8wdOc_7FApZ_yGqb_FDUzIOIWeEo6rV','application/vnd.openxmlformats-officedocument.wordprocessingml.document',5239515,false,1),
((select id from public.renstra_opd where slug='bapenda'),'2. KATA PENGANTAR.docx','https://docs.google.com/document/d/1JldxisY-s7KjBe08kvNb4u4agM13ZJye/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1JldxisY-s7KjBe08kvNb4u4agM13ZJye','application/vnd.openxmlformats-officedocument.wordprocessingml.document',18586,false,2),
((select id from public.renstra_opd where slug='bapenda'),'3. DAFTAR ISI.doc','https://docs.google.com/document/d/1K-Lh7Ifi__SjiEsK933AF3wNhe-to9YL/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1K-Lh7Ifi__SjiEsK933AF3wNhe-to9YL','application/msword',68608,false,3),
((select id from public.renstra_opd where slug='bapenda'),'4. DAFTAR GAMBAR.doc','https://docs.google.com/document/d/1kXu7dT-DBLaQnmKmHVHuVUwGE74BI_On/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1kXu7dT-DBLaQnmKmHVHuVUwGE74BI_On','application/msword',59392,false,4),
((select id from public.renstra_opd where slug='bapenda'),'5. DAFTAR TABEL.doc','https://docs.google.com/document/d/1GWsGpcCzY3Sh4GDMLrjViQ2aaPqWRChz/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1GWsGpcCzY3Sh4GDMLrjViQ2aaPqWRChz','application/msword',60416,false,5),
((select id from public.renstra_opd where slug='bapenda'),'Daftar Isi.docx','https://docs.google.com/document/d/1EXLJnkK7FWAV9JmQqZZ-CEdV87AT38_O/edit?usp=drivesdk&ouid=117327854592486140144&rtpof=true&sd=true','1EXLJnkK7FWAV9JmQqZZ-CEdV87AT38_O','application/vnd.openxmlformats-officedocument.wordprocessingml.document',18646,false,6)
on conflict (drive_file_id) do update set
  renstra_opd_id=excluded.renstra_opd_id,
  title=excluded.title,
  source_url=excluded.source_url,
  mime_type=excluded.mime_type,
  file_size=excluded.file_size,
  is_primary=excluded.is_primary,
  sort_order=excluded.sort_order;

comment on table public.renstra_opd is 'Katalog Renstra OPD; arsip ZIP sengaja tidak dimasukkan.';
comment on table public.renstra_documents is 'Dokumen sumber Renstra PDF/DOC/DOCX/folder chapter dari Google Drive.';
