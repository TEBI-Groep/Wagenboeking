// Gedeelde datum-helpers. Voorheen los gedupliceerd in Home/Admin/MijnBoekingen/MonthCalendar.
export const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

export const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function pad(n) { return String(n).padStart(2, '0') }

export function toDateString(date) {
  return date.toISOString().split('T')[0]
}

export function toDateStringYMD(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function getTodayString() {
  return toDateString(new Date())
}

export function formatDatumLang(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function formatDatumKort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}
