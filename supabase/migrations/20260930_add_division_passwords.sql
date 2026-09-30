-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Password disimpan sebagai bcrypt hash dan tidak pernah dikirim ke frontend.
alter table public.divisions
  add column if not exists password_hash text;

alter table public.divisions
  add column if not exists password_enabled boolean not null default false;

alter table public.divisions
  alter column password_enabled set default false;

update public.divisions
set password_enabled = false
where password_enabled is distinct from false;
