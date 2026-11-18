# TEBI Wagenboeking

PWA webapplicatie voor het boeken van de bedrijfswagen.

## Stack
- **React + Vite** — frontend
- **Supabase** — database (PostgreSQL)
- **Vercel** — hosting
- **vite-plugin-pwa** — installeerbaar als app op telefoon/PC

---

## Beveiliging

- **Inloggen:** met een code per e-mail (Supabase Auth, geen wachtwoord). Na inloggen blijft iemand op dat apparaat ingelogd.
- **Gebruikers = Supabase Authentication → Users.** Er is geen aparte gebruikerstabel (de oude tabel staat gearchiveerd als `users_oud`).
- **Wie mag erin:** alleen adressen op @tebi.nl en @gardenlux.nl. Het account ontstaat bij de eerste inlog; andere adressen weigert de database (er gaat geen mail uit).
- **Naam:** staat in het account (`user_metadata.naam`); de gebruiker vult die in bij de eerste inlog.
- **Rollen** (`app_metadata.rol`, niet door de gebruiker zelf te wijzigen):
  - `algemeen`: planning zien, op eigen naam boeken, eigen boekingen annuleren.
  - `beheerder`: daarnaast boekingen van anderen verwijderen, auto's blokkeren, accounts verwijderen (Beheer → Gebruikers).
  - Rollen wijzigen kan alleen it@tebi.nl (Beheer → Gebruikers). De rol van it@ ligt vast.
- **Regels in de database:** `supabase/beveiliging.sql`. De publieke sleutel in de website is zichtbaar voor iedereen; daarom bepaalt de database (RLS) wat iemand mag, niet de website. Noodgeval: `supabase/terugdraaien.sql`.
  - De database zet e-mail en naam van een boeking zelf (van de ingelogde gebruiker) en weigert overlap.
- **Mailendpoint:** werkt alleen met een geldige login, voor een eigen boeking, en mailt alleen naar het eigen adres.

### Supabase-instellingen (eenmalig, in het dashboard)
- Project Settings → Authentication → **SMTP Settings**: host `smtp.resend.com`, poort `465`, gebruiker `resend`, wachtwoord = een Resend API-key, afzender `it@tebi.nl`, naam `TEBI Wagenboeking`.
- Authentication → **Emails**: templates **Magic Link** én **Confirm signup**, onderwerp "Je inlogcode voor de Wagenboeking", body uit `supabase/email-inlogcode.html`.
- Authentication → Sign In / Providers → Email: **Confirm email** aan laten staan.

---

## Bevestigingsmail

- Na een boeking roept de app `api/send-confirmation.js` aan (Vercel-functie) met alleen het boeking-ID en het inlogtoken.
- Die haalt de boeking op en stuurt de gegevens naar Resend. Opmaak, onderwerp en afzender staan in **Resend → Templates → "Wagenboeking – reservering bevestigd"** (alias `wagenboeking-bevestiging`).
- Mail aanpassen: wijzig de template in Resend en klik op **Publish**. Geen code of deploy nodig.
- Beschikbare variabelen: `{{{VOORNAAM}}}`, `{{{DATUM}}}`, `{{{TIJDSLOT}}}`, `{{{AUTO}}}`, `{{{KENTEKEN}}}`, `{{{APP_URL}}}`. Nieuwe variabelen moeten ook in `send-confirmation.js` gevuld worden.
- De oude opmaak in code staat ter referentie in `archief/_bevestiging-mail.js`.
- `supabase/functions/send-booking-confirmation` wordt niet gebruikt.

---

## Uitbreiden

Toekomstige modules die toegevoegd kunnen worden:
- Artikelaanvraag (zelfde structuur, nieuw Supabase tabel)
- Authenticatie via Supabase Auth of Microsoft SSO
- E-mailnotificaties via Supabase Edge Functions
- Admin beveiliging met wachtwoord of rol
