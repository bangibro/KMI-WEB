-- Run this once in Supabase SQL Editor if the schema was already installed.
-- It allows trusted service-role seed operations while keeping client role
-- changes restricted to super_admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role = 'super_admin'
     and coalesce(public.current_role(), 'pemohon'::public.app_role) <> 'super_admin'::public.app_role then
    raise exception 'Only super_admin can change profile roles';
  end if;

  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and coalesce(public.current_role(), 'pemohon'::public.app_role) <> 'super_admin'::public.app_role then
    raise exception 'Only super_admin can change profile roles';
  end if;
  return new;
end;
$$;
