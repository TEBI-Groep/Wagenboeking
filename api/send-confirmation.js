import { Resend } from 'resend'
import { bevestigingMail } from './_bevestiging-mail.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { naam, email, datum, tijdslot, wagen, wagenNaam, kenteken } = req.body

  const datumFormatted = new Date(datum + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Basis-URL voor het logo en de link in de mail. APP_URL (optioneel) wint, anders het domein van dit verzoek.
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = process.env.APP_URL || `https://${host}`

  const mail = bevestigingMail({ naam, datumFormatted, tijdslot, wagen, wagenNaam, kenteken, baseUrl })

  try {
    const { data, error } = await resend.emails.send({
      from: 'TEBI Wagenboeking <it@tebi.nl>',
      to: [email],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
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
