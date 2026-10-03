-- C2.SECURITY.08-A
-- Harden public.is_admin() by using SECURITY INVOKER + RLS on public.admins.
-- This keeps the existing RPC contract while removing the SECURITY DEFINER privilege boundary.

grant select on table public.admins to authenticated;

drop policy if exists "admins_can_read_own_admin_row" on public.admins;
create policy "admins_can_read_own_admin_row"
on public.admins
for select
to authenticated
using ((select auth.uid()) = user_id);

alter function public.is_admin()
  security invoker
  set search_path = public, auth;
