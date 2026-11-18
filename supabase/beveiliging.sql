-- Beveiliging Wagenboeking. Uitvoeren in Supabase > SQL Editor, in één keer (één transactie:
-- gaat er iets mis, dan wordt niets doorgevoerd). Verwijdert geen boekingen.
--
-- Principe: de publieke (anon) sleutel staat in de website en is voor iedereen zichtbaar.
-- Daarom zit de beveiliging hier, in de database (Row Level Security), niet in de website.
--
-- Gebruikers = Authentication > Users. Er is geen aparte gebruikerstabel meer.
--   * Inloggen met een code per mail. Een account wordt aangemaakt bij de eerste inlog.
--   * Alleen adressen op @tebi.nl en @gardenlux.nl krijgen een account; andere adressen weigert
--     de database (er gaat dan ook geen mail uit).
--   * Naam staat in het account (user_metadata.naam), de gebruiker vult die zelf in bij eerste inlog.
--   * Rol staat in het account (app_metadata.rol). Die kan een gebruiker niet zelf wijzigen.
-- Rollen
--   * algemeen:  planning zien, op eigen naam boeken, eigen boekingen annuleren.
--   * beheerder: daarnaast boekingen van anderen verwijderen, auto's blokkeren, gebruikers verwijderen.
--   * Rollen wijzigen: alleen it@tebi.nl. De rol van it@tebi.nl zelf ligt vast.

begin;

-- 1. Oude gebruikerstabel archiveren (niet verwijderen) -----------------------------------------
alter table if exists public.users rename to users_oud;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'users_oud' loop
    execute format('drop policy %I on public.users_oud', p.policyname);
  end loop;
end $$;
alter table public.users_oud enable row level security;
revoke all on public.users_oud from anon, authenticated;

-- 2. Bestaande accounts: rol en naam ------------------------------------------------------------
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol',
  case when lower(email) in ('it@tebi.nl', 'jleemans@tebi.nl', 'sschoonderwoerd@tebi.nl') then 'beheerder' else 'algemeen' end);

update auth.users a
set raw_user_meta_data = coalesce(a.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('naam', u.naam)
from public.users_oud u
where lower(a.email) = lower(u.email) and coalesce(a.raw_user_meta_data ->> 'naam', '') = '';

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('naam', 'IT')
where lower(email) = 'it@tebi.nl' and coalesce(raw_user_meta_data ->> 'naam', '') = '';

-- 3. Hulpfuncties ------------------------------------------------------------------------------
create or replace function public.mijn_email()
returns text language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_toegestaan()
returns boolean language sql stable set search_path = public as $$
  select split_part(public.mijn_email(), '@', 2) in ('tebi.nl', 'gardenlux.nl')
$$;

create or replace function public.mijn_rol()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(raw_app_meta_data ->> 'rol', 'algemeen') from auth.users where id = auth.uid()
$$;

create or replace function public.is_beheerder()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_toegestaan() and coalesce(public.mijn_rol() = 'beheerder', false)
$$;

-- 4. Nieuw account: alleen eigen domeinen, standaardrol algemeen -------------------------------
create or replace function public.controleer_nieuw_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if split_part(lower(coalesce(new.email, '')), '@', 2) not in ('tebi.nl', 'gardenlux.nl') then
    raise exception 'Dit e-mailadres heeft geen toegang tot de Wagenboeking.';
  end if;
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol', 'algemeen');
  return new;
end;
$$;

drop trigger if exists controleer_nieuw_account on auth.users;
create trigger controleer_nieuw_account
  before insert on auth.users
  for each row execute function public.controleer_nieuw_account();

-- 5. Gebruikersbeheer (tabblad Gebruikers in Beheer) -------------------------------------------
create or replace function public.gebruikers_lijst()
returns table (id uuid, email text, naam text, rol text, laatst_ingelogd timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_beheerder() then raise exception 'Geen beheerrechten.'; end if;
  return query
    select a.id, lower(a.email)::text, (a.raw_user_meta_data ->> 'naam')::text,
           coalesce(a.raw_app_meta_data ->> 'rol', 'algemeen')::text, a.last_sign_in_at
    from auth.users a
    order by 4 desc, 3 nulls last;
end;
$$;

create or replace function public.zet_rol(p_user uuid, p_rol text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.mijn_email() <> 'it@tebi.nl' then raise exception 'Alleen it@tebi.nl mag rollen wijzigen.'; end if;
  if p_rol not in ('algemeen', 'beheerder') then raise exception 'Onbekende rol: %', p_rol; end if;
  if exists (select 1 from auth.users where id = p_user and lower(email) = 'it@tebi.nl') then
    raise exception 'De rol van it@tebi.nl ligt vast.';
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol', p_rol)
  where id = p_user;
end;
$$;

create or replace function public.verwijder_gebruiker(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_beheerder() then raise exception 'Geen beheerrechten.'; end if;
  if p_user = auth.uid() then raise exception 'Je kunt jezelf niet verwijderen.'; end if;
  if exists (select 1 from auth.users where id = p_user and lower(email) = 'it@tebi.nl') then
    raise exception 'it@tebi.nl kan niet verwijderd worden.';
  end if;
  delete from auth.users where id = p_user;
end;
$$;

revoke execute on function public.mijn_rol(), public.is_beheerder(), public.gebruikers_lijst(),
  public.zet_rol(uuid, text), public.verwijder_gebruiker(uuid) from public, anon;
grant execute on function public.mijn_rol(), public.is_beheerder(), public.gebruikers_lijst(),
  public.zet_rol(uuid, text), public.verwijder_gebruiker(uuid) to authenticated;

-- 6. Alle bestaande policies weg, RLS aan, anon eruit ------------------------------------------
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('bookings', 'vehicle_blocks')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.bookings       enable row level security;
alter table public.vehicle_blocks enable row level security;
revoke all on public.bookings, public.vehicle_blocks from anon;

-- 7. Policies ----------------------------------------------------------------------------------
create policy "bookings lezen" on public.bookings
  for select to authenticated using (public.is_toegestaan());
create policy "bookings eigen boeking maken" on public.bookings
  for insert to authenticated with check (public.is_toegestaan() and lower(email) = public.mijn_email());
create policy "bookings eigen annuleren of beheerder" on public.bookings
  for delete to authenticated using (lower(email) = public.mijn_email() or public.is_beheerder());
create policy "bookings beheerder wijzigen" on public.bookings
  for update to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

create policy "blocks lezen" on public.vehicle_blocks
  for select to authenticated using (public.is_toegestaan());
create policy "blocks beheerder beheren" on public.vehicle_blocks
  for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

-- 8. Controle bij elke nieuwe boeking ----------------------------------------------------------
-- E-mail en naam komen van de ingelogde gebruiker, niet uit de browser. Overlap wordt hier geweigerd,
-- met een lock per auto+dag zodat twee gelijktijdige boekingen niet allebei doorkomen.
create or replace function public.bookings_controle()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_naam text;
begin
  if auth.uid() is not null then
    new.email := public.mijn_email();
    select raw_user_meta_data ->> 'naam' into v_naam from auth.users where id = auth.uid();
    if coalesce(v_naam, '') <> '' then new.naam := v_naam; end if;
  end if;

  if new.tot <= new.van then
    raise exception 'De eindtijd moet na de begintijd liggen.';
  end if;
  if new.datum < (now() at time zone 'Europe/Amsterdam')::date then
    raise exception 'Je kunt niet in het verleden boeken.';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.wagen || '|' || new.datum::text));
  if exists (
    select 1 from public.bookings b
    where b.wagen = new.wagen and b.datum = new.datum
      and b.van < new.tot and b.tot > new.van
      and b.id is distinct from new.id
  ) then
    raise exception 'Deze auto is in dit tijdvak al gereserveerd.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_controle on public.bookings;
create trigger bookings_controle
  before insert on public.bookings
  for each row execute function public.bookings_controle();

commit;

-- Na afloop controleren:
--   select email, raw_user_meta_data->>'naam' as naam, raw_app_meta_data->>'rol' as rol from auth.users;
--   select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1, 2;
