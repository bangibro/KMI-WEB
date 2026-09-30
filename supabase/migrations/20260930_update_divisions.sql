-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Menyamakan daftar bidang/unit dengan struktur organisasi terbaru.
insert into public.divisions (name, description, password_enabled)
values
  ('Badan Pengurus Harian (BPH)', 'Pimpinan inti yang mengoordinasikan seluruh organisasi', false),
  ('Badan Penelitian & Pengembangan (Litbang)', 'Pusat pengkajian dan pengembangan sistem organisasi', false),
  ('Unit Kantor Media Informasi (KMI)', 'Pusat pengelolaan informasi dan media organisasi', false),
  ('Bidang PSDM', 'Pembinaan dan pengembangan sumber daya mahasiswa', false),
  ('Bidang Riset & Keilmuan (Riskel)', 'Pengembangan ekosistem riset dan keilmiahan', false),
  ('Bidang Kesejahteraan Mahasiswa (Kesma)', 'Pelayanan, advokasi, dan kesejahteraan mahasiswa', false),
  ('Bidang Hubungan Masyarakat (Humas)', 'Pengelolaan relasi eksternal dan citra organisasi', false),
  ('Bidang Pengabdian Masyarakat (Dimas)', 'Kegiatan sosial dan pengabdian kepada masyarakat', false),
  ('Bidang Minat, Bakat & Kegemaran (Mikatan)', 'Wadah pengembangan minat, bakat, dan UKM', false),
  ('Bidang Ekonomi & Bisnis (Ekobis)', 'Pengembangan kewirausahaan dan ekonomi organisasi', false)
on conflict (name) do update
set description = excluded.description;

update public.divisions
set description = null;

update public.requests
set division = 'Bidang PSDM'
where division = 'PSDM';

update public.requests
set division = 'Bidang Hubungan Masyarakat (Humas)'
where division = 'Humas';

update public.profiles
set division = 'Unit Kantor Media Informasi (KMI)'
where division = 'Media';

delete from public.divisions
where name in ('Acara', 'PSDM', 'Humas', 'Kastrad', 'Keuangan', 'Media', 'Sekretariat');
