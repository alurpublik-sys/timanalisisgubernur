-- Smart processing baseline for 9 BERANI and curated BERANI Cerdas 2026.
-- Keeps the newest uploaded source PDF, removes duplicate visible updates, and
-- converts the active record into a structured dashboard that future uploads can merge into.

alter table public.berani_update_sections
  drop constraint if exists berani_update_sections_section_type_check;

alter table public.berani_update_sections
  add constraint berani_update_sections_section_type_check
  check (section_type in ('kpis','bar_chart','stat_grid','trend','facts','text','image','comparison','table'));

do $$
declare
  p_id bigint;
  target_id bigint;
begin
  select id into p_id from public.berani_programs where slug='berani-cerdas';
  if p_id is null then
    return;
  end if;

  select id into target_id
  from public.berani_updates
  where program_id=p_id
  order by updated_at desc, created_at desc, id desc
  limit 1;

  if target_id is null then
    insert into public.berani_updates(
      program_id,title,opd_name,period_label,summary,source_key,row_count
    ) values (
      p_id,
      'BERANI Cerdas · Ringkasan Data Program Pendidikan 2026',
      'Dinas Pendidikan Provinsi Sulawesi Tengah',
      '8 September 2026',
      'Ringkasan data program pendidikan Provinsi Sulawesi Tengah tahun 2026, diolah dari Report BC - 8 Sept 2026.pdf. Dokumen sumber tetap disimpan utuh dan data terstruktur dipakai sebagai basis pembaruan berikutnya.',
      'live:berani-cerdas',
      10
    ) returning id into target_id;
  else
    delete from public.berani_updates
    where program_id=p_id and id<>target_id;

    update public.berani_updates
    set title='BERANI Cerdas · Ringkasan Data Program Pendidikan 2026',
        opd_name='Dinas Pendidikan Provinsi Sulawesi Tengah',
        period_label='8 September 2026',
        summary='Ringkasan data program pendidikan Provinsi Sulawesi Tengah tahun 2026, diolah dari Report BC - 8 Sept 2026.pdf. Dokumen sumber tetap disimpan utuh dan data terstruktur dipakai sebagai basis pembaruan berikutnya.',
        source_key='live:berani-cerdas',
        row_count=10,
        updated_at=now()
    where id=target_id;
  end if;

  delete from public.berani_update_sections where update_id=target_id;
  delete from public.berani_document_rows
  where document_id in (
    select id from public.berani_update_documents
    where update_id=target_id
  );

  update public.berani_update_documents
  set display_title='Report BC · Ringkasan Data Program Pendidikan 2026',
      summary='Dokumen sumber visual 14 halaman dari Dinas Pendidikan Provinsi Sulawesi Tengah. Data utama telah diolah menjadi indikator, tabel, perbandingan anggaran, dan sorotan program.',
      extracted_text=coalesce(extracted_text,
        'Program Prioritas Pendidikan 2026: BOSDA; bantuan SPP siswa miskin sekolah swasta; Beasiswa Cerdas Istimewa dan Bakat Istimewa; UKK dan Prakerin SMK; beasiswa mahasiswa; bantuan penyelesaian studi; beasiswa dan bantuan pendidikan guru/ASN/profesi; sarana pendidikan digital; Vokasional Siap Kerja; bantuan seragam sekolah. Total anggaran program pada tabel perbandingan: 2025 Rp178,837 miliar dan 2026 Rp355,261 miliar.'),
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'auto_processed',true,
        'curated',true,
        'image_based_pdf',true,
        'source_pages',14,
        'processed_at',now()
      )
  where update_id=target_id;

  insert into public.berani_update_sections(update_id,section_key,title,section_type,payload,sort_order)
  values
  (
    target_id,
    'auto:berani-cerdas:overview',
    'Ringkasan Utama BERANI Cerdas',
    'kpis',
    jsonb_build_object(
      'subtitle','Data program pendidikan 2026',
      'source','Report BC - 8 Sept 2026.pdf · Dinas Pendidikan Provinsi Sulawesi Tengah',
      'items',jsonb_build_array(
        jsonb_build_object('label','Anggaran Program 2026','value','Rp355,261 miliar','note','Total pada tabel anggaran 2025–2026'),
        jsonb_build_object('label','Anggaran Program 2025','value','Rp178,837 miliar','note','Basis perbandingan tahun sebelumnya'),
        jsonb_build_object('label','Sekolah Penerima BOSDA','value','453 sekolah','note','SMA, SMK dan SLB negeri/swasta'),
        jsonb_build_object('label','Siswa Penerima BOSDA','value','115.084 siswa','note','Total peserta didik'),
        jsonb_build_object('label','Rencana Penerima Beasiswa','value','±47.000 orang','note','±22.000 penerima lama + ±25.000 penerima baru'),
        jsonb_build_object('label','Mitra Perguruan Tinggi','value','401 PT','note','Perguruan tinggi negeri dan swasta')
      )
    ),
    10
  ),
  (
    target_id,
    'auto:berani-cerdas:budget-comparison',
    'Perbandingan Anggaran Program',
    'comparison',
    jsonb_build_object(
      'previousLabel','2025',
      'currentLabel','2026',
      'unit','miliar rupiah',
      'source','Report BC - 8 Sept 2026.pdf · halaman anggaran program',
      'items',jsonb_build_array(
        jsonb_build_object('label','BOSDA','previous','41,99','current','59,58'),
        jsonb_build_object('label','SPP siswa miskin sekolah swasta','previous','1,09','current','1,75'),
        jsonb_build_object('label','Cerdas Istimewa & Bakat Istimewa','previous','4,34','current','4,52'),
        jsonb_build_object('label','UKK & Prakerin siswa SMK','previous','39,95','current','21,56'),
        jsonb_build_object('label','Beasiswa Mahasiswa','previous','84,04','current','260,406'),
        jsonb_build_object('label','Guru, ASN & Pendidikan Profesi','previous','1,857','current','5,23'),
        jsonb_build_object('label','Sarana Pendidikan Digital','previous','0,48','current','0,43'),
        jsonb_build_object('label','Bantuan Seragam Sekolah','previous','5,09','current','1,785'),
        jsonb_build_object('label','TOTAL','previous','178,837','current','355,261')
      )
    ),
    20
  ),
  (
    target_id,
    'auto:berani-cerdas:priorities',
    '10 Program Prioritas Pendidikan',
    'table',
    jsonb_build_object(
      'subtitle','Program prioritas BERANI Cerdas',
      'source','Report BC - 8 Sept 2026.pdf · Program Prioritas Pendidikan',
      'columns',jsonb_build_array('No','Program'),
      'rows',jsonb_build_array(
        jsonb_build_object('No','01','Program','Pemberian BOSDA bagi SMA, SMK dan SLB Negeri maupun Swasta'),
        jsonb_build_object('No','02','Program','Pemberian Biaya SPP bagi siswa miskin di sekolah swasta SMA/SMK/SLB'),
        jsonb_build_object('No','03','Program','Pemberian Beasiswa Cerdas Istimewa dan Bakat Istimewa'),
        jsonb_build_object('No','04','Program','Biaya Uji Kompetensi dan Biaya Praktik Kerja Industri (Prakerin) bagi siswa SMK negeri dan swasta'),
        jsonb_build_object('No','05','Program','Pemberian beasiswa dan bantuan biaya pendidikan bagi mahasiswa miskin dan/atau berprestasi'),
        jsonb_build_object('No','06','Program','Pemberian bantuan biaya pendidikan bagi mahasiswa aktif miskin dan/atau berprestasi masa penyelesaian studi'),
        jsonb_build_object('No','07','Program','Pemberian beasiswa dan bantuan pendidikan bagi guru, ASN serta pendidikan profesi'),
        jsonb_build_object('No','08','Program','Perbaikan dan peningkatan sarana dan prasarana pendidikan berbasis digital SMA/SMK'),
        jsonb_build_object('No','09','Program','Pelatihan Vokasional Siap Kerja bagi generasi milenial dan Gen-Z'),
        jsonb_build_object('No','10','Program','Bantuan pemberian seragam sekolah')
      )
    ),
    30
  ),
  (
    target_id,
    'auto:berani-cerdas:bosda',
    'Penyaluran BOSDA Tahun 2026',
    'table',
    jsonb_build_object(
      'subtitle','453 sekolah · 115.084 siswa',
      'source','Report BC - 8 Sept 2026.pdf · BOSDA 2026',
      'columns',jsonb_build_array('Jenjang / Status','Sekolah','Siswa','Anggaran 2026'),
      'rows',jsonb_build_array(
        jsonb_build_object('Jenjang / Status','SLB · Total','Sekolah',33,'Siswa',2250,'Anggaran 2026','Rp3.227.280.000'),
        jsonb_build_object('Jenjang / Status','SLB · Negeri','Sekolah',16,'Siswa',1083,'Anggaran 2026','Rp1.156.920.000'),
        jsonb_build_object('Jenjang / Status','SLB · Swasta','Sekolah',17,'Siswa',1167,'Anggaran 2026','Rp2.070.360.000'),
        jsonb_build_object('Jenjang / Status','SMA · Total','Sekolah',236,'Siswa',74733,'Anggaran 2026','Rp34.929.600.000'),
        jsonb_build_object('Jenjang / Status','SMA · Negeri','Sekolah',178,'Siswa',70139,'Anggaran 2026','Rp30.566.280.000'),
        jsonb_build_object('Jenjang / Status','SMA · Swasta','Sekolah',58,'Siswa',4594,'Anggaran 2026','Rp4.363.320.000'),
        jsonb_build_object('Jenjang / Status','SMK · Total','Sekolah',184,'Siswa',38101,'Anggaran 2026','Rp21.426.600.000'),
        jsonb_build_object('Jenjang / Status','SMK · Negeri','Sekolah',107,'Siswa',30882,'Anggaran 2026','Rp14.603.520.000'),
        jsonb_build_object('Jenjang / Status','SMK · Swasta','Sekolah',77,'Siswa',7219,'Anggaran 2026','Rp6.823.080.000'),
        jsonb_build_object('Jenjang / Status','GRAND TOTAL','Sekolah',453,'Siswa',115084,'Anggaran 2026','Rp59.583.460.000')
      )
    ),
    40
  ),
  (
    target_id,
    'auto:berani-cerdas:scholarship',
    'Beasiswa Mahasiswa & Pendidikan Lanjutan',
    'stat_grid',
    jsonb_build_object(
      'subtitle','Realisasi dan rencana program beasiswa',
      'source','Report BC - 8 Sept 2026.pdf · Rekapitulasi Anggaran Program Beasiswa Mahasiswa',
      'items',jsonb_build_array(
        jsonb_build_object('label','S1 Semester Ganjil 2025','value','23.568','note','penerima · pembiayaan > Rp84 miliar'),
        jsonb_build_object('label','S1 Semester Genap 2026','value','22.414','note','penerima · pembiayaan > Rp80 miliar'),
        jsonb_build_object('label','Rencana Anggaran Beasiswa 2026','value','±Rp260 miliar','note','±47.000 penerima total'),
        jsonb_build_object('label','Magister (S2)','value','100','note','orang'),
        jsonb_build_object('label','Doktoral (S3)','value','20','note','orang'),
        jsonb_build_object('label','Dokter Spesialis','value','10','note','orang'),
        jsonb_build_object('label','Bantuan Penyelesaian Studi','value','300','note','orang')
      )
    ),
    50
  ),
  (
    target_id,
    'auto:berani-cerdas:highlights',
    'Capaian & Dukungan Program',
    'facts',
    jsonb_build_object(
      'source','Report BC - 8 Sept 2026.pdf · rangkaian program 2026',
      'items',jsonb_build_array(
        jsonb_build_object('title','SPP Siswa Miskin SMA Swasta','detail','Anggaran Rp1.750.000.000 untuk bantuan uang pendaftaran dan/atau SPP.'),
        jsonb_build_object('title','Cerdas Istimewa & Bakat Istimewa','detail','205 siswa berasrama di SMA Negeri Olahraga (SMANOR) Tadulako Palu dengan alokasi Rp4.520.925.000.'),
        jsonb_build_object('title','UKK & Prakerin SMK','detail','1.910 siswa dengan total anggaran Rp21.562.000.000: 1.024 penerima Prakerin (Rp15,36 miliar) dan 886 penerima UKK (Rp6,202 miliar).'),
        jsonb_build_object('title','Peningkatan Kualifikasi Guru','detail','99 guru mengikuti Beasiswa S2 dengan anggaran Rp2.475.000.000.'),
        jsonb_build_object('title','Upskilling & Reskilling Guru SMK','detail','160 guru SMK dengan anggaran Rp2.760.000.000.'),
        jsonb_build_object('title','Akses Internet Pendidikan','detail','10 sekolah dengan anggaran Rp430.500.000 untuk membantu sekolah yang kesulitan akses jaringan internet.'),
        jsonb_build_object('title','Revitalisasi Satuan Pendidikan','detail','104 sekolah: 36 SMA, 46 SMK, dan 22 SLB dengan total anggaran Rp123.013.282.000.'),
        jsonb_build_object('title','Vokasional Siap Kerja','detail','220 peserta. Dokumen menuliskan total anggaran “Rp4,2M”; satuan dipertahankan sesuai sumber dan perlu verifikasi sebelum dinarasikan sebagai nilai tertentu.'),
        jsonb_build_object('title','Bantuan Seragam Sekolah','detail','Target 3.149 siswa SMA/SMK/SLB dengan alokasi Rp1.785.310.000.')
      )
    ),
    60
  );
end $$;
