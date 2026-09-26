with p as (
  select id from public.berani_programs where slug='berani-lancar'
),
upserted as (
  insert into public.berani_updates(
    program_id,title,opd_name,period_label,summary,source_key,file_name,mime_type,file_size,sheet_name,columns,row_count
  )
  select
    p.id,
    'Paket BERANI LANCAR Tahun 2026',
    'Dinas Bina Marga dan Penataan Ruang Provinsi Sulawesi Tengah',
    '2026',
    'Data awal memuat 47 paket pekerjaan: 22 telah mencapai realisasi fisik 100%, 22 masih berjalan, dan 3 belum memiliki nilai realisasi fisik pada dokumen sumber.',
    'seed:berani-lancar-bina-marga-2026',
    'PAKET BERANI LANCAR BINA MARGA 2026.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    26266,
    'BERANI LANCAR 2026',
    '["NO","NAMA PAKET PEKERJAAN","PAGU ANGGARAN 2026","PANJANG PENANGANAN","NILAI KONTRAK","LOKASI","PERSENTASE REALISASI FISIK","KETERANGAN"]'::jsonb,
    47
  from p
  on conflict (source_key) do update set
    title=excluded.title,opd_name=excluded.opd_name,period_label=excluded.period_label,summary=excluded.summary,
    file_name=excluded.file_name,mime_type=excluded.mime_type,file_size=excluded.file_size,sheet_name=excluded.sheet_name,
    columns=excluded.columns,row_count=excluded.row_count,updated_at=now()
  returning id
),
target as (
  select id from upserted
  union all
  select id from public.berani_updates where source_key='seed:berani-lancar-bina-marga-2026'
  limit 1
),
cleared as (
  delete from public.berani_update_rows where update_id=(select id from target)
)
insert into public.berani_update_rows(update_id,row_index,data)
select (select id from target),v.row_index,v.data
from (values
(1, $seed${"NO":1,"LOKASI":"Desa Oyom dan Desa Maibua Kab. Tolitoli","KETERANGAN":null,"NILAI KONTRAK":62812568000,"PAGU ANGGARAN 2026":9421885200,"PANJANG PENANGANAN":"11,4 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Sp. Lampasio - Muliasari (MYC)","PERSENTASE REALISASI FISIK":0.05225}$seed$::jsonb),
(2, $seed${"NO":2,"LOKASI":"Desa Tinombo Kab. Parigi Moutong","KETERANGAN":null,"NILAI KONTRAK":2845108000,"PAGU ANGGARAN 2026":2845108000,"PANJANG PENANGANAN":"1,2 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Tinombo - Lombok Barat","PERSENTASE REALISASI FISIK":0.85032}$seed$::jsonb),
(3, $seed${"NO":3,"LOKASI":"Desa Wosu Kab. Morowali ","KETERANGAN":null,"NILAI KONTRAK":9899232000,"PAGU ANGGARAN 2026":9899232000,"PANJANG PENANGANAN":"3,156 KM","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Dalam Desa Wosu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(4, $seed${"NO":4,"LOKASI":"Desa Kokobuka Kab. Buol","KETERANGAN":null,"NILAI KONTRAK":4046384000,"PAGU ANGGARAN 2026":4046384000,"PANJANG PENANGANAN":" 4 KM","NAMA PAKET PEKERJAAN":"Pembangunan Jalan Ruas Lambunu - Buol","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(5, $seed${"NO":5,"LOKASI":"Desa Batu Mandi, Desa Bollo, Desa Sobol dan Desa Pondan Kab. Banggai","KETERANGAN":null,"NILAI KONTRAK":34647492000,"PAGU ANGGARAN 2026":4800000000,"PANJANG PENANGANAN":"11,40 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Pangkalaseang - Balantak - Sobol (MYC)","PERSENTASE REALISASI FISIK":0.1112}$seed$::jsonb),
(6, $seed${"NO":6,"LOKASI":"Desa Toipan, Desa Siuna, Desa Lembah Tompotika dan Desa Longkoga Barat Kab. Banggai","KETERANGAN":null,"NILAI KONTRAK":32604390000,"PAGU ANGGARAN 2026":4890658500,"PANJANG PENANGANAN":"13,39 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Poh - Siuna - Mayayap - Bualemo (MYC)","PERSENTASE REALISASI FISIK":0.0792}$seed$::jsonb),
(7, $seed${"NO":7,"LOKASI":"Desa Balingara Kab. Banggai","KETERANGAN":null,"NILAI KONTRAK":58177530000,"PAGU ANGGARAN 2026":8800000000,"PANJANG PENANGANAN":"16 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Balingara - Longge Atas - Dataran Bulan (MYC)","PERSENTASE REALISASI FISIK":0.2434}$seed$::jsonb),
(8, $seed${"NO":8,"LOKASI":"Desa Kokobuka Kab. Buol","KETERANGAN":null,"NILAI KONTRAK":72244583000,"PAGU ANGGARAN 2026":10000000000,"PANJANG PENANGANAN":"17 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Muliasari - Kokobuka - Air Terang - Kalikulango (MYC)","PERSENTASE REALISASI FISIK":0.23737}$seed$::jsonb),
(9, $seed${"NO":9,"LOKASI":"Desa Lee, Desa Kasingoli, Desa Gontara, Desa Tomata, Kab. Morowali Utara","KETERANGAN":null,"NILAI KONTRAK":72958327000,"PAGU ANGGARAN 2026":10000000000,"PANJANG PENANGANAN":"11,2 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Pape - Tomata (MYC)","PERSENTASE REALISASI FISIK":0.22813}$seed$::jsonb),
(10, $seed${"NO":10,"LOKASI":"Desa Tomata Kab. Morowali Utara","KETERANGAN":null,"NILAI KONTRAK":2706736000,"PAGU ANGGARAN 2026":2748776000,"PANJANG PENANGANAN":"0,69 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Barati - Tomata (DBH SAWIT)","PERSENTASE REALISASI FISIK":0.64634}$seed$::jsonb),
(11, $seed${"NO":11,"LOKASI":"Desa Transmigrasi Kancu'u Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":2946345000,"PAGU ANGGARAN 2026":2946345000,"PANJANG PENANGANAN":"1,55 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Desa Transmigrasi Kancu'u","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(12, $seed${"NO":12,"LOKASI":"Desa Minti Makmur Kab. Donggala","KETERANGAN":null,"NILAI KONTRAK":1935344000,"PAGU ANGGARAN 2026":1935344000,"PANJANG PENANGANAN":"0,55 KM","NAMA PAKET PEKERJAAN":"Pemeliharaan Berkala Jalan Desa Lalundu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(13, $seed${"NO":13,"LOKASI":"Desa Beteleme Kab. Morowali Utara","KETERANGAN":null,"NILAI KONTRAK":48744759403,"PAGU ANGGARAN 2026":7000000000,"PANJANG PENANGANAN":12.2,"NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Beteleme - Nuha (MYC)","PERSENTASE REALISASI FISIK":0.0347}$seed$::jsonb),
(14, $seed${"NO":14,"LOKASI":"Desa Wosu Kab. Morowali ","KETERANGAN":null,"NILAI KONTRAK":3357621654,"PAGU ANGGARAN 2026":3357622000,"PANJANG PENANGANAN":"3,2 KM","NAMA PAKET PEKERJAAN":"Pembangunan Jalan Desa Wosu Manu - Manu ","PERSENTASE REALISASI FISIK":0.95396}$seed$::jsonb),
(15, $seed${"NO":15,"LOKASI":"Desa Salukaia dan Desa Toinasa Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":28291604000,"PAGU ANGGARAN 2026":4500000000,"PANJANG PENANGANAN":7.3,"NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Tonusu - Meko (MYC)","PERSENTASE REALISASI FISIK":0.0854}$seed$::jsonb),
(16, $seed${"NO":16,"LOKASI":"Desa Meko dan Desa Owini Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":30182160000,"PAGU ANGGARAN 2026":4510000000,"PANJANG PENANGANAN":"8,6 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Meko - Pendolo (MYC)","PERSENTASE REALISASI FISIK":0.0928}$seed$::jsonb),
(17, $seed${"NO":17,"LOKASI":"Desa Sangginora Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":7383443068,"PAGU ANGGARAN 2026":7383500000,"PANJANG PENANGANAN":"2 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Hae - Sangginora","PERSENTASE REALISASI FISIK":0.77956}$seed$::jsonb),
(18, $seed${"NO":18,"LOKASI":"Desa Dolo Kab. Sigi","KETERANGAN":null,"NILAI KONTRAK":62469624000,"PAGU ANGGARAN 2026":7500000000,"PANJANG PENANGANAN":"18.00 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Palu - Kulawi (MYC)","PERSENTASE REALISASI FISIK":0.0483}$seed$::jsonb),
(19, $seed${"NO":19,"LOKASI":"Desa luk panenteng Kab. Banggai Kepulauan","KETERANGAN":null,"NILAI KONTRAK":52369508910,"PAGU ANGGARAN 2026":7200000000,"PANJANG PENANGANAN":12,"NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas Sabang - Baas (MYC)","PERSENTASE REALISASI FISIK":0.07216}$seed$::jsonb),
(20, $seed${"NO":20,"LOKASI":"U Manasoli-Lawanga-Toyado Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":3945558173,"PAGU ANGGARAN 2026":3945559000,"PANJANG PENANGANAN":"1.720 KM","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Ruas U Manasoli - Lawanga - Toyado","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(21, $seed${"NO":21,"LOKASI":"Tonusu - Gintu kab. Poso","KETERANGAN":null,"NILAI KONTRAK":1135395000,"PAGU ANGGARAN 2026":1135395000,"PANJANG PENANGANAN":"203 M","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Ruas Tonusu Gintu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(22, $seed${"NO":22,"LOKASI":"Desa Sintuwulemba Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":570119301,"PAGU ANGGARAN 2026":570120000,"PANJANG PENANGANAN":"243 M","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Desa Sintuwulemba","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(23, $seed${"NO":23,"LOKASI":"Desa Patoyan Kab. Tojo Una una","KETERANGAN":null,"NILAI KONTRAK":5319897000,"PAGU ANGGARAN 2026":5319897000,"PANJANG PENANGANAN":12,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Ruas Wakai - Kulingkinari","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(24, $seed${"NO":24,"LOKASI":"Desa Sabulira Kab. Tojo Una una","KETERANGAN":null,"NILAI KONTRAK":1100000000,"PAGU ANGGARAN 2026":1100000000,"PANJANG PENANGANAN":"724 M","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Desa Sabulira Toba","PERSENTASE REALISASI FISIK":null}$seed$::jsonb),
(25, $seed${"NO":25,"LOKASI":"Desa Walandanu Kab. Donggala","KETERANGAN":null,"NILAI KONTRAK":1560228000,"PAGU ANGGARAN 2026":1560228000,"PANJANG PENANGANAN":1.5,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Dalam Desa Walandanu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(26, $seed${"NO":26,"LOKASI":"Desa Malino Kab. Morowali Utara","KETERANGAN":null,"NILAI KONTRAK":581355000,"PAGU ANGGARAN 2026":581360000,"PANJANG PENANGANAN":"109 M","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Ruas Malino - Sumarajaya ","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(27, $seed${"NO":27,"LOKASI":"Desa Moa Kab. Sigi - Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":3406814000,"PAGU ANGGARAN 2026":3413020600.0000005,"PANJANG PENANGANAN":"2.80 KM","NAMA PAKET PEKERJAAN":"Pembangunan Jalan Ruas Gimpu - Gintu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(28, $seed${"NO":28,"LOKASI":"Desa Pelawa Baru Kab. Parigi Moutong","KETERANGAN":null,"NILAI KONTRAK":1488429000,"PAGU ANGGARAN 2026":1488429000,"PANJANG PENANGANAN":0.94,"NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan  Desa Pelawa","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(29, $seed${"NO":29,"LOKASI":"Desa Dolago-Padang Kab. Parigi Moutong","KETERANGAN":null,"NILAI KONTRAK":1791690000,"PAGU ANGGARAN 2026":1847520000,"PANJANG PENANGANAN":0.61,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Desa Dolago Padang","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(30, $seed${"NO":30,"LOKASI":"Desa Purwosari Kab. Parigi Moutong","KETERANGAN":null,"NILAI KONTRAK":1048870000,"PAGU ANGGARAN 2026":1048870000,"PANJANG PENANGANAN":0.49,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Desa Purwosari","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(31, $seed${"NO":31,"LOKASI":"Kelurahan Talise Kota Palu","KETERANGAN":null,"NILAI KONTRAK":3969780000,"PAGU ANGGARAN 2026":3969780000,"PANJANG PENANGANAN":"0,648 KM","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Dalam Kawasan Hutan Kota","PERSENTASE REALISASI FISIK":0.4105}$seed$::jsonb),
(32, $seed${"NO":32,"LOKASI":"Kec. Banggai, Kab. Banggai Laut","KETERANGAN":null,"NILAI KONTRAK":2962950500,"PAGU ANGGARAN 2026":2969000000,"PANJANG PENANGANAN":"883 m","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Ruas Banggai - Lokotoy","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(33, $seed${"NO":33,"LOKASI":"Desa Tontouan Kab. Banggai","KETERANGAN":null,"NILAI KONTRAK":7289043500,"PAGU ANGGARAN 2026":7289043500,"PANJANG PENANGANAN":"7,8 km","NAMA PAKET PEKERJAAN":"Rekonstruksi Jalan Desa Tontouan - Air Terjun Mokokawa","PERSENTASE REALISASI FISIK":0.56}$seed$::jsonb),
(34, $seed${"NO":34,"LOKASI":"Desa Tambayoli Kab. Morowali Utara","KETERANGAN":null,"NILAI KONTRAK":3627246000,"PAGU ANGGARAN 2026":3720000000,"PANJANG PENANGANAN":"3 KM","NAMA PAKET PEKERJAAN":"Pembangunan Jalan Ruas Tambayoli - Matube - Baturube","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(35, $seed${"NO":35,"LOKASI":"Desa Anca, Kec. Lindu, Kab. Sigi","KETERANGAN":null,"NILAI KONTRAK":1422900000,"PAGU ANGGARAN 2026":1450000000,"PANJANG PENANGANAN":"2 km","NAMA PAKET PEKERJAAN":"Pembangunan Jalan Lingkar Danau Lindu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(36, $seed${"NO":36,"LOKASI":"Desa Lembantongoa Kab. Sigi","KETERANGAN":null,"NILAI KONTRAK":2980021000,"PAGU ANGGARAN 2026":2980021000,"PANJANG PENANGANAN":0.82,"NAMA PAKET PEKERJAAN":"Rekonstruksi  Jalan Desa Lembantongoa Kecamatan Palolo","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(37, $seed${"NO":37,"LOKASI":"Desa Pelawa Kab. Parimo","KETERANGAN":null,"NILAI KONTRAK":1470917000,"PAGU ANGGARAN 2026":1471001000,"PANJANG PENANGANAN":0.63,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jalan Ruas Pelawa - Binangga","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(38, $seed${"NO":38,"LOKASI":"Desa Lompio Kab. Banggai laut","KETERANGAN":null,"NILAI KONTRAK":28788027000,"PAGU ANGGARAN 2026":3240000000,"PANJANG PENANGANAN":35,"NAMA PAKET PEKERJAAN":"Penggantian Jembatan Paisu Puso (MYC)","PERSENTASE REALISASI FISIK":0.1275}$seed$::jsonb),
(39, $seed${"NO":39,"LOKASI":"Desa Tovia Tambu Kab. Donggala","KETERANGAN":null,"NILAI KONTRAK":3965183000,"PAGU ANGGARAN 2026":3965184000,"PANJANG PENANGANAN":"23.60 M","NAMA PAKET PEKERJAAN":"Pembangunan Jembatan Kampung Baru II (Tahap 1)","PERSENTASE REALISASI FISIK":0.6838}$seed$::jsonb),
(40, $seed${"NO":40,"LOKASI":"Desa Jononunu Kab. Parimo","KETERANGAN":null,"NILAI KONTRAK":3459194000,"PAGU ANGGARAN 2026":3500000000,"PANJANG PENANGANAN":"74.00 M","NAMA PAKET PEKERJAAN":"Pembangunan Bangunan Bawah Jembatan Jononunu","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(41, $seed${"NO":41,"LOKASI":"Desa Ampibabo Kab. Parimo","KETERANGAN":null,"NILAI KONTRAK":946486000,"PAGU ANGGARAN 2026":1000000000,"PANJANG PENANGANAN":"0.47 KM","NAMA PAKET PEKERJAAN":"Rehabilitasi Jalam Dalam Desa Ampibabo","PERSENTASE REALISASI FISIK":0.5955}$seed$::jsonb),
(42, $seed${"NO":42,"LOKASI":"Desa Bainaa Kab. Parimo","KETERANGAN":null,"NILAI KONTRAK":790504000,"PAGU ANGGARAN 2026":790504000,"PANJANG PENANGANAN":"11.00 M","NAMA PAKET PEKERJAAN":"Pembangunan Jembatan Desa Bainaa Barat","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(43, $seed${"NO":43,"LOKASI":"Desa Mayasari Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":958349000,"PAGU ANGGARAN 2026":958349000,"PANJANG PENANGANAN":"18.00 M","NAMA PAKET PEKERJAAN":"Penggantian Jembatan Mayasari tahap 2","PERSENTASE REALISASI FISIK":1}$seed$::jsonb),
(44, $seed${"NO":44,"LOKASI":"Desa Labuan Kab. Donggala","KETERANGAN":null,"NILAI KONTRAK":2027242800,"PAGU ANGGARAN 2026":2027242800,"PANJANG PENANGANAN":48,"NAMA PAKET PEKERJAAN":"Rehabilitasi Jembatan Labuan","PERSENTASE REALISASI FISIK":null}$seed$::jsonb),
(45, $seed${"NO":45,"LOKASI":"Desa Wombo Kab. Donggala","KETERANGAN":null,"NILAI KONTRAK":2830648000,"PAGU ANGGARAN 2026":3000000000,"PANJANG PENANGANAN":25,"NAMA PAKET PEKERJAAN":"Penggantian Jembatan Desa Wombo","PERSENTASE REALISASI FISIK":0.341}$seed$::jsonb),
(46, $seed${"NO":46,"LOKASI":"Desa Barati Kab. Poso","KETERANGAN":null,"NILAI KONTRAK":3879599000,"PAGU ANGGARAN 2026":3879600000,"PANJANG PENANGANAN":10,"NAMA PAKET PEKERJAAN":"Penggantian Jembatan Patasi Desa Barati","PERSENTASE REALISASI FISIK":null}$seed$::jsonb),
(47, $seed${"NO":47,"LOKASI":"Desa Bolano Tengah Kab. Parimo","KETERANGAN":null,"NILAI KONTRAK":1946707000,"PAGU ANGGARAN 2026":2000000000,"PANJANG PENANGANAN":10,"NAMA PAKET PEKERJAAN":"Penggantian Jembatan Desa Bolano Tengah","PERSENTASE REALISASI FISIK":0.2578}$seed$::jsonb)
) as v(row_index,data);
