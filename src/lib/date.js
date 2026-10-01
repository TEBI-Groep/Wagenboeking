// Gedeelde datum-helpers. Datums zijn overal strings 'YYYY-MM-DD' in lokale (Nederlandse) tijd.
export const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

export const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function pad(n) { return String(n).padStart(2, '0') }

// Lokale datum, niet UTC: toISOString() gaf tussen 00:00 en 02:00 nog de vorige dag terug.
export function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toDateStringYMD(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function getTodayString() {
  return toDateString(new Date())
}

export function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

// Maandag van de week waarin dateStr valt
export function startOfWeek(dateStr) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toDateString(d)
}

// ISO-weeknummer (week 1 = de week met de eerste donderdag van het jaar)
export function weekNumber(dateStr) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

// "donderdag 2 oktober 2026"
export function formatDatumLang(dateStr) {
  return parseDate(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// "donderdag 2 oktober"
export function formatDatumKort(dateStr) {
  return parseDate(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

// "Do 2 okt" (los label, dus met hoofdletter)
export function formatDag(dateStr) {
  const s = parseDate(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "2 okt"
export function formatKort(dateStr) {
  return parseDate(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

// "08:00:00" -> "08:00"
export function formatTijd(tijd) {
  return tijd ? tijd.slice(0, 5) : ''
}
