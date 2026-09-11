alter table public.kunjungan drop constraint if exists kunjungan_status_check;
alter table public.kunjungan add constraint kunjungan_status_check check (status in ('Terjadwal','Selesai','Ditunda'));

alter table public.isu_strategis drop constraint if exists isu_strategis_prioritas_check;
alter table public.isu_strategis add constraint isu_strategis_prioritas_check check (prioritas is null or prioritas in ('Tinggi','Sedang','Rendah'));
alter table public.isu_strategis drop constraint if exists isu_strategis_status_check;
alter table public.isu_strategis add constraint isu_strategis_status_check check (status_monitoring in ('Aktif','Monitoring','Perlu Tindak Lanjut','Selesai'));

alter table public.rekomendasi drop constraint if exists rekomendasi_status_check;
alter table public.rekomendasi add constraint rekomendasi_status_check check (status in ('Draft','Review','Final'));

alter table public.media_monitoring drop constraint if exists media_monitoring_sentimen_check;
alter table public.media_monitoring add constraint media_monitoring_sentimen_check check (sentimen is null or sentimen in ('Positif','Netral','Negatif'));

alter table public.agenda drop constraint if exists agenda_tipe_check;
alter table public.agenda add constraint agenda_tipe_check check (tipe is null or tipe in ('Rapat','Kunjungan','Tugas','Koordinasi'));
alter table public.agenda drop constraint if exists agenda_status_check;
alter table public.agenda add constraint agenda_status_check check (status in ('Terjadwal','Proses','Selesai','Ditunda'));

alter table public.kontribusi_kerja drop constraint if exists kontribusi_kerja_status_check;
alter table public.kontribusi_kerja add constraint kontribusi_kerja_status_check check (status in ('Dalam Proses','Selesai'));
