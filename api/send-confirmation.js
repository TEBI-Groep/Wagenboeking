import { Resend } from 'resend'

// Opmaak, onderwerp en afzender van de mail staan in Resend: Templates > "Wagenboeking – reservering bevestigd".
// Hier worden alleen de gegevens van de boeking ingevuld.
const TEMPLATE = 'wagenboeking-bevestiging'

const resend = new Resend(process.env.RESEND_API_KEY)

// Haalt tekens weg waarmee iemand HTML in de mail zou kunnen zetten.
const schoon = s => String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 120)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { naam, email, datum, tijdslot, wagen, wagenNaam, kenteken } = req.body || {}

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres' })
  }

  const datumFormatted = new Date(datum + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Basis-URL voor het logo en de link in de mail. APP_URL (optioneel) wint, anders het domein van dit verzoek.
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = process.env.APP_URL || `https://${host}`

  try {
    const { data, error } = await resend.emails.send({
      to: [email],
      template: {
        id: TEMPLATE,
        variables: {
          VOORNAAM: schoon(String(naam || '').trim().split(/\s+/)[0]) || 'collega',
          DATUM: schoon(datumFormatted),
          TIJDSLOT: schoon(tijdslot),
          AUTO: schoon(wagenNaam || wagen) || '-',
          KENTEKEN: schoon(kenteken) || '-',
          APP_URL: baseUrl,
        },
      },
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error })
    }

    console.log('Mail verstuurd:', data)
    return res.status(200).json({ ok: true, data })

  } catch (err) {
    console.error('Onverwachte fout:', err)
    return res.status(500).json({ error: err.message })
  }
}
