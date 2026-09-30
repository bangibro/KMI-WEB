-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Menetapkan PIC secara acak tanpa mengulang sampai seluruh PIC mendapat giliran.

create table if not exists public.pic_rotation (
  pic_name text primary key,
  cycle integer not null default 1,
  assigned_at timestamptz not null default now()
);

alter table public.pic_rotation enable row level security;

create or replace function public.assign_random_pic(request_id uuid)
returns table(id uuid, assigned_to text)
language plpgsql
security definer
set search_path = public
as $$
declare
  names text[] := array['Reza','Sindhu','Farid','Evelyn','Ibro','Rozzan','Mukti','Fayza'];
  current_cycle integer;
  selected_pic text;
begin
  perform pg_advisory_xact_lock(827364);
  select coalesce(max(pr.cycle), 1) into current_cycle from public.pic_rotation pr;

  select candidate into selected_pic
  from unnest(names) as candidate
  where not exists (
    select 1 from public.pic_rotation pr
    where pr.pic_name = candidate and pr.cycle = current_cycle
  )
  order by random()
  limit 1;

  if selected_pic is null then
    current_cycle := current_cycle + 1;
    delete from public.pic_rotation;
    select candidate into selected_pic from unnest(names) as candidate order by random() limit 1;
  end if;

  insert into public.pic_rotation(pic_name, cycle) values (selected_pic, current_cycle)
  on conflict (pic_name) do update set cycle = excluded.cycle, assigned_at = now();

  update public.requests
  set assigned_to = selected_pic, updated_at = now()
  where requests.id = request_id;

  return query select requests.id, requests.assigned_to
  from public.requests
  where requests.id = request_id;
end;
$$;
