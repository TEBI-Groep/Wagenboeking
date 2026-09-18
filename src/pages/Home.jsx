import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getVehicleName } from '../lib/vehicles'
import { getTodayString } from '../lib/date'
import MonthCalendar from '../components/MonthCalendar'

export default function Home() {
  const [user, setUser] = useState(null)
  const [wagen, setWagen] = useState(VEHICLES[0].id)
  const [datum, setDatum] = useState(getTodayString())
  const [van, setVan] = useState('08:00')
  const [tot, setTot] = useState('12:00')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [allBookings, setAllBookings] = useState([])
  const navigate = useNavigate()

  const fetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('naam, datum, van, tot, wagen')
      .order('datum', { ascending: true })
    if (data) setAllBookings(data)
  }, [])

  useEffect(() => {
    const opgeslagen = localStorage.getItem('tebi_user')
    if (!opgeslagen) navigate('/start')
    else setUser(JSON.parse(opgeslagen))
    fetchBookings()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!datum || !van || !tot) {
      setError('Vul alle velden in.')
      return
    }

    if (van >= tot) {
      setError('Eindtijd moet na de begintijd liggen.')
      return
    }

    setLoading(true)

    // Check overlappende boekingen op die datum, voor dezelfde wagen
    const { data: bestaand, error: checkError } = await supabase
      .from('bookings')
      .select('van, tot, naam')
      .eq('datum', datum)
      .eq('wagen', wagen)

    if (checkError) {
      setError('Er is een fout opgetreden. Probeer opnieuw.')
      setLoading(false)
      return
    }

    const overlap = bestaand?.find(b => van < b.tot && tot > b.van)
    if (overlap) {
      setError(`${getVehicleName(getVehicle(wagen))} (${getVehicle(wagen).variant}) is al geboekt van ${overlap.van.slice(0,5)} tot ${overlap.tot.slice(0,5)} door ${overlap.naam}. Kies een ander tijdslot of een andere auto.`)
      setLoading(false)
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
      const mailRes = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: user.naam, email: user.email, datum, tijdslot, wagen: `${getVehicleName(getVehicle(wagen))} – ${getVehicle(wagen).variant} (${getVehicle(wagen).kenteken})` })
      })
      const mailData = await mailRes.json()
      console.log('Mail response:', mailData)
    } catch (mailErr) {
      console.warn('Mail kon niet worden verstuurd:', mailErr)
    }

    setSuccess(true)
    setVan('08:00')
    setTot('12:00')
    setLoading(false)
    fetchBookings()
  }

  function uitloggen() {
    localStorage.removeItem('tebi_user')
    navigate('/start')
  }

  if (!user) return null

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Bedrijfswagen boeken</h1>
            <p className="page-subtitle">Reserveer de bedrijfswagen voor een datum en tijdslot.</p>
          </div>
          <div className="user-chip">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.naam}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={uitloggen}>Wijzig</button>
          </div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          ✓ Boeking voor <strong>{getVehicleName(getVehicle(wagen))}</strong> ({getVehicle(wagen).variant}) geplaatst! Je ontvangt een bevestiging op <strong>{user.email}</strong>.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Vehicle picker: grote kaarten met ruimte voor een foto */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label>Kies een auto</label>
        <div className="vehicle-grid">
          {VEHICLES.map(v => {
            const actief = wagen === v.id
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => setWagen(v.id)}
                className="vehicle-card"
                style={{
                  border: actief ? `2px solid ${v.kleur}` : '2px solid var(--border)',
                  boxShadow: actief ? `0 4px 16px ${v.kleur}26` : 'var(--shadow-sm)',
                }}
              >
                <div className="vehicle-card-photo" style={{ background: v.foto ? `center / cover no-repeat url(${v.foto})` : `linear-gradient(135deg, ${v.kleur}22, ${v.kleur}0a)` }}>
                  {!v.foto && (
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.55 }}>
                      <path d="M3 12l1.5-4.5A2 2 0 0 1 6.4 6h11.2a2 2 0 0 1 1.9 1.5L21 12" stroke={v.kleur} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="2" y="12" width="20" height="6" rx="1.5" stroke={v.kleur} strokeWidth="1.6"/>
                      <circle cx="7" cy="18.5" r="1.6" fill={v.kleur}/>
                      <circle cx="17" cy="18.5" r="1.6" fill={v.kleur}/>
                    </svg>
                  )}
                  {actief && (
                    <span className="vehicle-card-check" style={{ background: v.kleur }}>✓</span>
                  )}
                </div>
                <div className="vehicle-card-info">
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: actief ? v.kleur : 'var(--text)' }}>
                    {v.merk} {v.model}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {v.variant}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontFamily: 'monospace', marginTop: 4 }}>
                    {v.kenteken}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="booking-layout">
        <div>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="datum">Datum</label>
                <input
                  id="datum"
                  type="date"
                  value={datum}
                  min={getTodayString()}
                  onChange={e => setDatum(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="van">Van</label>
                  <input
                    id="van"
                    type="time"
                    value={van}
                    onChange={e => setVan(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="tot">Tot</label>
                  <input
                    id="tot"
                    type="time"
                    value={tot}
                    onChange={e => setTot(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Bezig met opslaan...' : 'Boeking plaatsen →'}
              </button>
            </form>

            <div className="divider" />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Overlappende boekingen worden automatisch geblokkeerd.
            </p>
          </div>
        </div>

        <MonthCalendar
          bookings={allBookings}
          selectedDate={datum}
          onSelectDate={setDatum}
        />
      </div>
    </div>
  )
}