-- NOODGEVAL: zet de beveiliging uit beveiliging.sql terug naar de oude (open) situatie, zodat de
-- vorige versie van de app weer werkt. Gebruik samen met een rollback van de deploy in Vercel
-- (Vercel > Deployments > vorige deployment > Instant Rollback).
-- Gegevens blijven staan. Rol en naam in de accounts blijven bestaan maar doen dan niets.

begin;

drop trigger if exists controleer_nieuw_account on auth.users;
drop trigger if exists bookings_controle on public.bookings;

do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('bookings', 'vehicle_blocks', 'users_oud')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table if exists public.users_oud rename to users;

alter table public.bookings disable row level security;
alter table public.users    disable row level security;

grant all on public.bookings, public.users, public.vehicle_blocks to anon, authenticated;

create policy "blocks lezen" on public.vehicle_blocks for select using (true);
create policy "blocks beheren" on public.vehicle_blocks for all to authenticated using (true) with check (true);

commit;
