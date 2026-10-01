-- Auto blokkeren (bijv. onderhoud/defect). Uitvoeren in Supabase > SQL Editor.
-- Een blokkade geldt voor hele dagen: van_datum t/m tot_datum (inclusief).

create table if not exists public.vehicle_blocks (
  id uuid primary key default gen_random_uuid(),
  wagen text not null,
  van_datum date not null,
  tot_datum date not null,
  reden text,
  created_at timestamptz not null default now(),
  check (tot_datum >= van_datum)
);

alter table public.vehicle_blocks enable row level security;

-- Iedereen (anon) mag lezen: de boekpagina moet geblokkeerde auto's kunnen tonen.
create policy "blocks lezen" on public.vehicle_blocks
  for select using (true);

-- Alleen ingelogde admins mogen blokkades aanmaken/verwijderen.
create policy "blocks beheren" on public.vehicle_blocks
  for all to authenticated using (true) with check (true);

-- Afdwingen aan de serverkant: een boeking op een geblokkeerde dag wordt geweigerd,
-- ook als iemand de frontend omzeilt.
create or replace function public.check_vehicle_block()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.vehicle_blocks b
    where b.wagen = new.wagen
      and new.datum between b.van_datum and b.tot_datum
  ) then
    raise exception 'Deze auto is op die datum niet beschikbaar (geblokkeerd).';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_check_block on public.bookings;
create trigger bookings_check_block
  before insert on public.bookings
  for each row execute function public.check_vehicle_block();
