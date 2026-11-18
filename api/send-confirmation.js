import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { getVehicle, getVehicleName } from '../src/lib/vehicles.js'

// Verstuurt de bevestigingsmail van een boeking.
// Beveiliging: alleen een ingelogde gebruiker kan dit aanroepen, alleen voor een boeking die op
// zijn eigen e-mailadres staat, en de mail gaat altijd naar dat adres. De browser stuurt alleen het
// boeking-ID mee; alle gegevens komen uit de database.
//
// Opmaak, onderwerp en afzender staan in Resend: Templates > "Wagenboeking – reservering bevestigd".
const TEMPLATE = 'wagenboeking-bevestiging'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const schoon = s => String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 120)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const bookingId = req.body?.bookingId
  if (!token) return res.status(401).json({ error: 'Niet ingelogd' })
  if (!bookingId || typeof bookingId !== 'string') return res.status(400).json({ error: 'bookingId ontbreekt' })

  // Supabase-client namens de ingelogde gebruiker: de database-regels (RLS) gelden dus ook hier.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.email) return res.status(401).json({ error: 'Niet ingelogd' })
  const email = user.email.toLowerCase()

  const { data: boeking, error: boekingError } = await supabase
    .from('bookings')
    .select('naam, email, datum, van, tot, wagen')
    .eq('id', bookingId)
    .maybeSingle()
  if (boekingError) return res.status(500).json({ error: 'Boeking ophalen mislukt' })
  if (!boeking || boeking.email?.toLowerCase() !== email) return res.status(404).json({ error: 'Boeking niet gevonden' })

  const v = getVehicle(boeking.wagen)

  const datumFormatted = new Date(boeking.datum + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const tijdslot = `${String(boeking.van).slice(0, 5)} – ${String(boeking.tot).slice(0, 5)}`

  // Basis-URL voor het logo en de link in de mail. APP_URL (optioneel) wint, anders het domein van dit verzoek.
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = process.env.APP_URL || `https://${host}`

  try {
    const { data, error } = await resend.emails.send({
      to: [email],
      template: {
        id: TEMPLATE,
        variables: {
          VOORNAAM: schoon(String(boeking.naam || '').trim().split(/\s+/)[0]) || 'collega',
          DATUM: schoon(datumFormatted),
          TIJDSLOT: schoon(tijdslot),
          AUTO: schoon(`${getVehicleName(v)} · ${v.variant}`),
          KENTEKEN: schoon(v.kenteken) || '-',
          APP_URL: baseUrl,
        },
      },
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error: 'Mail versturen mislukt' })
    }

    return res.status(200).json({ ok: true, id: data?.id })
  } catch (err) {
    console.error('Onverwachte fout:', err)
    return res.status(500).json({ error: 'Mail versturen mislukt' })
  }
}
