// HTML-mail voor de reserveringsbevestiging, in de huisstijl van de app.
// Opgebouwd met tabellen en inline styles: mailprogramma's (vooral Outlook) ondersteunen weinig CSS.
// Bestanden met een _ ervoor in /api worden door Vercel niet als losse functie gepubliceerd.

const K = {
  groen: '#13803f',
  ink: '#1d2730',
  ink2: '#4c5d6c',
  ink3: '#7c8893',
  lijn: '#e1e5e9',
  bg: '#f4f6f7',
  voet: '#f7f8f9',
  plaat: '#f6c400',
  eu: '#1f4fa3',
}
const FONT = "'IBM Plex Sans', Arial, Helvetica, sans-serif"
const MONO = "'IBM Plex Mono', Consolas, 'Courier New', monospace"

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function rij(label, waarde, laatste = false) {
  const rand = laatste ? '' : `border-bottom:1px solid ${K.lijn};`
  return `
    <tr>
      <td style="${rand}padding:12px 16px;width:96px;font-family:${FONT};font-size:13px;color:${K.ink3};vertical-align:middle;">${label}</td>
      <td style="${rand}padding:12px 16px;font-family:${FONT};font-size:15px;font-weight:600;color:${K.ink};vertical-align:middle;">${waarde}</td>
    </tr>`
}

function kentekenplaat(kenteken) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
      <tr>
        <td style="background:${K.eu};color:#ffffff;font-family:Arial,sans-serif;font-size:9px;font-weight:700;padding:6px 4px 3px;border-radius:3px 0 0 3px;vertical-align:bottom;">NL</td>
        <td style="background:${K.plaat};color:#111111;font-family:${MONO};font-size:13px;font-weight:700;letter-spacing:1px;padding:4px 9px;border-radius:0 3px 3px 0;">${esc(kenteken)}</td>
      </tr>
    </table>`
}

export function bevestigingMail({ naam, datumFormatted, tijdslot, wagen, wagenNaam, kenteken, baseUrl }) {
  const voornaam = String(naam || '').trim().split(/\s+/)[0] || 'collega'
  const auto = wagenNaam || wagen || '-'
  const linkBoekingen = `${baseUrl}/mijn-boekingen`

  const rijen = [
    rij('Datum', esc(datumFormatted)),
    rij('Tijd', esc(tijdslot)),
    rij('Auto', esc(auto), !kenteken),
    kenteken ? rij('Kenteken', kentekenplaat(kenteken), true) : '',
  ].join('')

  const subject = `Reservering bevestigd – ${datumFormatted}, ${tijdslot}`

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${K.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(auto)}, ${esc(datumFormatted)}, ${esc(tijdslot)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${K.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid ${K.lijn};border-top:3px solid ${K.groen};border-radius:8px;">
          <tr>
            <td style="padding:28px 32px 0;">
              <img src="${baseUrl}/logo.png" width="112" alt="TEBI Bestratingsmaterialen" style="display:block;width:112px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;font-family:${FONT};">
              <h1 style="margin:0 0 6px;font-family:${FONT};font-size:20px;line-height:1.3;font-weight:600;color:${K.ink};">Je reservering is bevestigd</h1>
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.5;color:${K.ink2};">Hoi ${esc(voornaam)}, de auto staat op jouw naam. Hieronder de gegevens.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${K.lijn};border-radius:6px;border-collapse:separate;">
                ${rijen}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${K.groen};border-radius:6px;">
                    <a href="${linkBoekingen}" style="display:inline-block;padding:11px 20px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Bekijk mijn boekingen</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;font-family:${FONT};font-size:13px;line-height:1.5;color:${K.ink3};">
              Kun je toch niet? Annuleer de reservering via Mijn boekingen, dan kan een collega de auto gebruiken.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:${K.voet};border-top:1px solid ${K.lijn};border-radius:0 0 8px 8px;font-family:${FONT};font-size:12px;line-height:1.5;color:${K.ink3};">
              TEBI Bestratingsmaterialen · Wagenboeking<br>
              Deze mail is automatisch verstuurd.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    'Je reservering is bevestigd',
    '',
    `Hoi ${voornaam}, de auto staat op jouw naam.`,
    '',
    `Datum:    ${datumFormatted}`,
    `Tijd:     ${tijdslot}`,
    `Auto:     ${auto}`,
    kenteken ? `Kenteken: ${kenteken}` : null,
    '',
    `Annuleren kan via Mijn boekingen: ${linkBoekingen}`,
    '',
    'TEBI Bestratingsmaterialen · Wagenboeking',
  ].filter(r => r !== null).join('\n')

  return { subject, html, text }
}
