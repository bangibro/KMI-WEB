-- Request yang keluar dari status Selesai harus kembali ke daftar aktif.
create or replace function public.archive_completed_request()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Selesai' then
    new.completed_at := coalesce(new.completed_at, now());
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_auto_archive_completed on public.requests;
create trigger requests_auto_archive_completed
before insert or update of status on public.requests
for each row
execute function public.archive_completed_request();
