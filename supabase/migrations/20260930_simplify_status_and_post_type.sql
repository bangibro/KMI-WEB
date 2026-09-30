-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Bersihkan data lama yang memakai pilihan status/jenis yang sudah dihapus.
update public.requests
set status = 'Diproses'
where status in ('Diterima', 'Revisi', 'Ditolak');

update public.requests
set post_type = 'Feed'
where post_type not in ('Feed', 'Story', 'Reels');

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.requests'::regclass
      and con.contype = 'c'
      and (
        pg_get_constraintdef(con.oid) ilike '%status%'
        or pg_get_constraintdef(con.oid) ilike '%post_type%'
      )
  loop
    execute format(
      'alter table public.requests drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.requests
  add constraint requests_status_check
    check (status in ('Menunggu', 'Diproses', 'Selesai')),
  add constraint requests_post_type_check
    check (post_type in ('Feed', 'Story', 'Reels'));
