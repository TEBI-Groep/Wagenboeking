import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getVehicleName, getBlock } from '../lib/vehicles'
import { getTodayString, formatDatumLang, formatDatumKort, formatDag, formatTijd } from '../lib/date'
import MonthCalendar from '../components/MonthCalendar'
import DayTimeline from '../components/DayTimeline'
import Plate from '../components/Plate'
import { Check } from '../components/Icons'

const PRESETS = [
  { label: 'Ochtend', van: '08:00', tot: '12:00' },
  { label: 'Middag', van: '12:00', tot: '17:00' },
  { label: 'Hele dag', van: '08:00', tot: '17:00' },
]

export default function Home() {
  const [user, setUser] = useState(null)
  const [wagen, setWagen] = useState(VEHICLES[0].id)
  const [datum, setDatum] = useState(getTodayString())
  const [van, setVan] = useState('08:00')
  const [tot, setTot] = useState('12:00')
  const [loading, setLoading] = useState(false)
  const [bevestiging, setBevestiging] = useState(null)
  const [error, setError] = useState('')
  const [allBookings, setAllBookings] = useState([])
  const [blocks, setBlocks] = useState([])
  const navigate = useNavigate()
  const today = getTodayString()

  const fetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, naam, datum, van, tot, wagen')
      .gte('datum', getTodayString())
      .order('datum', { ascending: true })
    if (data) setAllBookings(data)
  }, [])

  const fetchBlocks = useCallback(async () => {
    const { data } = await supabase
      .from('vehicle_blocks')
      .select('wagen, van_datum, tot_datum, reden')
      .gte('tot_datum', getTodayString())
    if (data) setBlocks(data)
  }, [])

  useEffect(() => {
    const opgeslagen = localStorage.getItem('tebi_user')
    if (!opgeslagen) navigate('/start')
    else setUser(JSON.parse(opgeslagen))
    fetchBookings()
    fetchBlocks()
  }, [])

  // Staat de gekozen auto op de gekozen datum geblokkeerd, schuif dan door naar de eerste beschikbare.
  useEffect(() => {
    if (!getBlock(blocks, wagen, datum)) return
    const vrij = VEHICLES.find(v => !getBlock(blocks, v.id, datum))
    if (vrij) setWagen(vrij.id)
  }, [blocks, datum, wagen])

  const vehicle = getVehicle(wagen)
  const dagBoekingen = allBookings.filter(b => b.datum === datum)
  const tijdFout = !!van && !!tot && van >= tot
  const overlap = !tijdFout && dagBoekingen.find(b =>
    b.wagen === wagen && van < formatTijd(b.tot) && tot > formatTijd(b.van)
  )
  const geblokkeerd = !!getBlock(blocks, wagen, datum)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBevestiging(null)

    if (!datum || !van || !tot) { setError('Vul alle velden in.'); return }
    if (tijdFout) { setError('De eindtijd moet na de begintijd liggen.'); return }
    if (geblokkeerd) { setError(`${getVehicleName(vehicle)} (${vehicle.variant}) is op deze datum niet beschikbaar.`); return }

    setLoading(true)

    // Opnieuw controleren op de server: iemand anders kan net geboekt hebben
    const { data: bestaand, error: checkError } = await supabase
      .from('bookings')
      .select('van, tot, naam')
      .eq('datum', datum)
      .eq('wagen', wagen)

    if (checkError) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.')
      setLoading(false)
      return
    }

    const conflict = bestaand?.find(b => van < formatTijd(b.tot) && tot > formatTijd(b.van))
    if (conflict) {
      setError(`${getVehicleName(vehicle)} (${vehicle.variant}) is al gereserveerd van ${formatTijd(conflict.van)} tot ${formatTijd(conflict.tot)} door ${conflict.naam}.`)
      setLoading(false)
      fetchBookings()
      return
    }

    const tijdslot = `${van} – ${tot}`
    const { error: insertError } = await supabase
      .from('bookings')
      .insert([{ naam: user.naam, email: user.email, datum, tijdslot, van, tot, wagen }])

    if (insertError) {
      setError('Opslaan mislukt: ' + insertError.message)
      setLoading(false)
      return
    }

    try {
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam: user.naam, email: user.email, datum, tijdslot,
          wagen: `${getVehicleName(vehicle)} – ${vehicle.variant} (${vehicle.kenteken})`,
          wagenNaam: `${getVehicleName(vehicle)} · ${vehicle.variant}`,
          kenteken: vehicle.kenteken,
        }),
      })
    } catch (mailErr) {
      console.warn('Mail kon niet worden verstuurd:', mailErr)
    }

    setBevestiging({ wagen, datum, van, tot, email: user.email })
    setLoading(false)
    fetchBookings()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function wijzigGebruiker() {
    localStorage.removeItem('tebi_user')
    navigate('/start')
  }

  if (!user) return null

  const bevestigdeWagen = bevestiging && getVehicle(bevestiging.wagen)

  return (
    <div className="shell">
      <header className="page-head">
        <div>
          <h1 className="page-title">Auto reserveren</h1>
          <p className="page-sub">Kies een auto, een dag en een tijdvak.</p>
        </div>
        <div className="who">
          <div className="who-name">{user.naam}</div>
          <div className="who-mail">
            {user.email} · <button type="button" className="link" onClick={wijzigGebruiker}>Wijzigen</button>
          </div>
        </div>
      </header>

      {bevestiging && (
        <div className="notice notice-success">
          <strong>Reservering geplaatst.</strong>{' '}
          {getVehicleName(bevestigdeWagen)} · {bevestigdeWagen.variant}, {formatDatumLang(bevestiging.datum)} van {bevestiging.van} tot {bevestiging.tot}.
          De bevestiging is verstuurd naar {bevestiging.email}.
        </div>
      )}
      {error && <div className="notice notice-error">{error}</div>}

      <section className="section">
        <h2 className="section-title"><span className="step">1</span>Auto</h2>
        <div className="vehicle-grid">
          {VEHICLES.map(v => {
            const block = getBlock(blocks, v.id, datum)
            const aantal = dagBoekingen.filter(b => b.wagen === v.id).length
            const selected = wagen === v.id && !block
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => setWagen(v.id)}
                disabled={!!block}
                aria-pressed={selected}
                className={`vehicle${selected ? ' is-selected' : ''}${block ? ' is-blocked' : ''}`}
                title={block?.reden ? `Niet beschikbaar: ${block.reden}` : undefined}
              >
                <div className="vehicle-photo">
                  {v.foto && <img src={v.foto} alt="" loading="lazy" />}
                  <span className="vehicle-radio">{selected && <Check />}</span>
                  {block && <span className="vehicle-flag">Niet beschikbaar t/m {formatDag(block.tot_datum)}</span>}
                </div>
                <div className="vehicle-body">
                  <div className="vehicle-name">{getVehicleName(v)}</div>
                  <div className="vehicle-variant">
                    <span className="dot" style={{ background: v.kleur }} />
                    {v.variant}
                  </div>
                  <div className="vehicle-meta">
                    <Plate kenteken={v.kenteken} />
                    {!block && (aantal === 0
                      ? <span className="tag tag-green">Vrij</span>
                      : <span className="tag">{aantal} {aantal === 1 ? 'reservering' : 'reserveringen'}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="booking-grid">
        <section>
          <h2 className="section-title"><span className="step">2</span>Dag</h2>
          <MonthCalendar
            bookings={allBookings}
            selectedDate={datum}
            onSelectDate={setDatum}
            isDisabled={d => d < today || !!getBlock(blocks, wagen, d)}
            isBlocked={d => !!getBlock(blocks, wagen, d)}
          />
        </section>

        <section>
          <h2 className="section-title"><span className="step">3</span>Tijd</h2>
          <form className="panel" onSubmit={handleSubmit}>
            <div className="panel-body stack">
              <div className="field">
                <span className="field-label">Tijdvak</span>
                <div className="segmented segmented-fill">
                  {PRESETS.map(p => (
                    <button
                      type="button"
                      key={p.label}
                      className={van === p.van && tot === p.tot ? 'is-active' : ''}
                      onClick={() => { setVan(p.van); setTot(p.tot) }}
                    >
                      {p.label} <span className="muted num">{p.van}–{p.tot}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">Van</span>
                  <input className="input num" type="time" value={van} onChange={e => setVan(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="field-label">Tot</span>
                  <input className="input num" type="time" value={tot} onChange={e => setTot(e.target.value)} required />
                </label>
              </div>

              <div className="field">
                <span className="field-label">Bezetting op {formatDatumKort(datum)}</span>
                <DayTimeline
                  date={datum}
                  bookings={allBookings}
                  blocks={blocks}
                  selectedWagen={wagen}
                  selection={tijdFout ? null : { van, tot, conflict: !!overlap }}
                />
              </div>

              {tijdFout && <div className="notice notice-error">De eindtijd moet na de begintijd liggen.</div>}
              {overlap && (
                <div className="notice notice-warn">
                  Overlapt met de reservering van {overlap.naam} ({formatTijd(overlap.van)}–{formatTijd(overlap.tot)}).
                  Kies een ander tijdvak of een andere auto.
                </div>
              )}
            </div>

            <div className="panel-foot">
              <div>
                <div className="summary-main">{getVehicleName(vehicle)} · {vehicle.variant}</div>
                <div className="summary-sub num">{formatDatumLang(datum)}, {van}–{tot}</div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || tijdFout || !!overlap || geblokkeerd}>
                {loading ? 'Bezig met opslaan…' : 'Reserveren'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
