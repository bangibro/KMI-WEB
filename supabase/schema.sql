-- Jalankan sekali di Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;
drop trigger if exists auth_user_profile on auth.users;
drop table if exists public.activity_logs, public.requests, public.profiles, public.divisions cascade;
drop type if exists public.app_role cascade;
create type public.app_role as enum ('super_admin','admin_bidang','pic_staff');

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  password_hash text,
  password_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.app_role not null default 'pic_staff',
  division text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique check (length(public_token)=48),
  requester_name text not null,
  division text not null,
  title text not null,
  post_type text not null check (post_type in ('Feed','Story','Reels')),
  slide_count integer not null check (slide_count > 0),
  draft_url text not null check (draft_url ~* '^https?://'),
  deadline timestamptz not null,
  description text,
  status text not null default 'Menunggu' check (status in ('Menunggu','Diproses','Selesai')),
  assigned_to text,
  admin_note text,
  result_url text check (result_url is null or result_url ~* '^https?://'),
  archived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.pic_rotation (
  pic_name text primary key,
  cycle integer not null default 1,
  assigned_at timestamptz not null default now()
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null
);
create index requests_status_idx on public.requests(status);
create index requests_created_idx on public.requests(created_at desc);
create index activity_request_idx on public.activity_logs(request_id,created_at);

alter table public.divisions enable row level security;
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.activity_logs enable row level security;
create policy "public can read divisions" on public.divisions for select to anon,authenticated using (true);
create policy "admins manage divisions" on public.divisions for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin'));
create policy "admins read profiles" on public.profiles for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid()));
create policy "public can create requests" on public.requests for insert to anon,authenticated with check (true);
create policy "admins read requests" on public.requests for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid()));
create policy "admins update requests" on public.requests for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=auth.uid()));
create policy "admins delete requests" on public.requests for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid()));
create policy "admins read logs" on public.activity_logs for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),lower(new.email)) on conflict(id) do nothing; return new; end; $$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
