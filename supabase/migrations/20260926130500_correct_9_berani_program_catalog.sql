delete from public.berani_programs
where slug in ('berani-berdering','berani-tangkap','berani-panen-raya')
  and not exists (
    select 1 from public.berani_updates u where u.program_id = berani_programs.id
  );

insert into public.berani_programs(slug,name,summary,sort_order,active) values
('berani-cerdas','BERANI Cerdas','Pusat data dan pembaruan program BERANI Cerdas.',1,true),
('berani-sehat','BERANI Sehat','Pusat data dan pembaruan program BERANI Sehat.',2,true),
('berani-sejahtera','BERANI Sejahtera','Pusat data dan pembaruan program BERANI Sejahtera.',3,true),
('berani-lancar','BERANI Lancar','Pusat data dan pembaruan terkait infrastruktur dan konektivitas BERANI Lancar.',4,true),
('berani-menyala','BERANI Menyala','Pusat data dan pembaruan program BERANI Menyala.',5,true),
('berani-makmur','BERANI Makmur','Pusat data dan pembaruan program BERANI Makmur.',6,true),
('berani-berkah','BERANI Berkah','Pusat data dan pembaruan program BERANI Berkah.',7,true),
('berani-harmoni','BERANI Harmoni','Pusat data dan pembaruan program BERANI Harmoni.',8,true),
('berani-berintegritas','BERANI Berintegritas','Pusat data dan pembaruan program BERANI Berintegritas.',9,true)
on conflict (slug) do update set
  name=excluded.name,
  summary=excluded.summary,
  sort_order=excluded.sort_order,
  active=true;
