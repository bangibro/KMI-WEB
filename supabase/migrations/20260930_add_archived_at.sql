-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Migration aman: tidak menghapus data request yang sudah ada.
alter table public.requests
  add column if not exists archived_at timestamptz;

create index if not exists requests_archived_idx
  on public.requests(archived_at);

drop policy if exists "admins delete requests" on public.requests;
create policy "admins delete requests"
on public.requests for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
  )
);
