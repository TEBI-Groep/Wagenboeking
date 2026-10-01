// Centrale lijst van bedrijfswagens. Hier voeg je een auto toe/verwijder je er een/wijzig je gegevens.
// naam (merk + model) is de hoofdnaam op de kaart, variant is de subtekst (bijv. kleur of bijnaam).
// foto: plaats het bestand in /public/vehicles/ en verwijs ernaar, bijv. '/vehicles/berlingo-zilver.jpg'.
// Laat foto op null staan zolang je nog geen foto hebt — dan toont de kaart een kleurvlak i.p.v. een gebroken afbeelding.
export const VEHICLES = [
  { id: 'berlingo_geel_oud', merk: 'Citroën', model: 'Berlingo', variant: 'Geel oud', kenteken: 'TF-098-N', kleur: '#c99700', foto: '/vehicles/Citroen_berlingo_geel_oud.jpg' },
  { id: 'berlingo_zilver', merk: 'Citroën', model: 'Berlingo', variant: 'Zilver', kenteken: 'VKZ-24-K', kleur: '#7d8a97', foto: '/vehicles/Citroen_berlingo_zilver.jpg' },
  { id: 'berlingo_henk', merk: 'Citroën', model: 'Berlingo', variant: 'Henk', kenteken: 'VLR-28-N', kleur: '#b4533a', foto: '/vehicles/Citroen_berlingo_henk.jpg' },
  { id: 'mercedes_eqv', merk: 'Mercedes', model: 'EQV', variant: 'Elektrische bus', kenteken: 'S-464-GP', kleur: '#2f68b0', foto: '/vehicles/Mercedes_EQV_300.jpg' },
]

export function getVehicle(id) {
  return VEHICLES.find(v => v.id === id) || VEHICLES[0]
}

// Geeft de blokkade terug die voor deze wagen op deze datum (YYYY-MM-DD) geldt, of undefined.
export function getBlock(blocks, wagenId, datum) {
  return blocks.find(b => b.wagen === wagenId && datum >= b.van_datum && datum <= b.tot_datum)
}

// Hoofdnaam voor op kaarten/badges, bijv. "Citroën Berlingo" of "Mercedes EQV"
export function getVehicleName(v) {
  return `${v.merk} ${v.model}`
}