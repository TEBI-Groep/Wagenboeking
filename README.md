# TEBI Wagenboeking

PWA webapplicatie voor het boeken van de bedrijfswagen.

## Stack
- **React + Vite** — frontend
- **Supabase** — database (PostgreSQL)
- **Vercel** — hosting
- **vite-plugin-pwa** — installeerbaar als app op telefoon/PC

---

## Bevestigingsmail

- Na een boeking roept de app `api/send-confirmation.js` aan (Vercel-functie).
- Die stuurt alleen de boekingsgegevens naar Resend. Opmaak, onderwerp en afzender staan in **Resend → Templates → "Wagenboeking – reservering bevestigd"** (alias `wagenboeking-bevestiging`).
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
