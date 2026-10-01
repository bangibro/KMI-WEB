-- Jalankan sekali di Supabase Dashboard > SQL Editor.
alter table public.requests
  add column if not exists idempotency_key text;

create unique index if not exists requests_idempotency_key_idx
  on public.requests(idempotency_key)
  where idempotency_key is not null;
