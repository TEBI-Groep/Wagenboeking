import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getBlock } from '../lib/vehicles'
import { getTodayString, startOfWeek, addDays, weekNumber, formatDag, formatKort, formatTijd } from '../lib/date'
import VehicleLabel from '../components/VehicleLabel'
import ConfirmButton from '../components/ConfirmButton'
import { ChevronLeft, ChevronRight } from '../components/Icons'

export default function MijnBoekingen() {
  const today = getTodayString()
  const [user, setUser] = useState(null)
  const [mijn, setMijn] = useState([])
  const [week, setWeek] = useState([])
  const [blocks, setBlocks] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(today))
  const [wagenFilter, setWagenFilter] = useState('alle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const weekEnd = addDays(weekStart, 6)

  useEffect(() => {
    const opgeslagen = localStorage.getItem('tebi_user')
    if (!opgeslagen) return
    const u = JSON.parse(opgeslagen)
    setUser(u)
    fetchMijn(u)
  }, [])

  useEffect(() => {
    fetchWeek()
  }, [weekStart])

  async function fetchMijn(u) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('email', u.email)
      .gte('datum', today)
      .order('datum', { ascending: true })
      .order('van', { ascending: true })
    if (error) setError('Fout bij ophalen: ' + error.message)
    else setMijn(data || [])
  }

  async function fetchWeek() {
    setLoading(true)
    const [boekingenRes, blocksRes] = await Promise.all([
      supabase.from('bookings').select('*')
        .gte('datum', weekStart).lte('datum', weekEnd)
        .order('datum', { ascending: true }).order('van', { ascending: true }),
      supabase.from('vehicle_blocks').select('*')
        .lte('van_datum', weekEnd).gte('tot_datum', weekStart),
    ])
    if (boekingenRes.error) setError('Fout bij ophalen: ' + boekingenRes.error.message)
    else setWeek(boekingenRes.data || [])
    setBlocks(blocksRes.data || [])
    setLoading(false)
  }

  async function annuleer(id) {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) { setError('Annuleren mislukt: ' + error.message); return }
    setMijn(prev => prev.filter(b => b.id !== id))
    setWeek(prev => prev.filter(b => b.id !== id))
  }

  const dagen = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const zichtbareWagens = wagenFilter === 'alle' ? VEHICLES : VEHICLES.filter(v => v.id === wagenFilter)

  return (
    <div className="shell">
      <header className="page-head">
        <div>
          <h1 className="page-title">Mijn boekingen</h1>
          <p className="page-sub">Je eigen reserveringen en de planning van alle auto's.</p>
        </div>
      </header>

      {error && <div className="notice notice-error">{error}</div>}

      {user && (
        <section className="section">
          <h2 className="section-title">Jouw reserveringen</h2>
          <div className="panel">
            {mijn.length === 0 ? (
              <div className="empty">
                Je hebt geen aankomende reserveringen. <Link to="/">Auto reserveren</Link>
              </div>
            ) : mijn.map(b => (
              <div key={b.id} className="list-row">
                <div className="list-date">
                  <div className="strong">{formatDag(b.datum)}</div>
                  <div className="muted num">{formatTijd(b.van)}–{formatTijd(b.tot)}</div>
                </div>
                <div className="list-main"><VehicleLabel vehicle={getVehicle(b.wagen)} plate /></div>
                <ConfirmButton onConfirm={() => annuleer(b.id)}>Annuleren</ConfirmButton>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Planning</h2>
          <div className="weeknav">
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Vorige week"><ChevronLeft /></button>
            <span className="weeknav-label num">Week {weekNumber(weekStart)} · {formatKort(weekStart)} – {formatKort(weekEnd)}</span>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Volgende week"><ChevronRight /></button>
            {weekStart !== startOfWeek(today) && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWeekStart(startOfWeek(today))}>Deze week</button>
            )}
          </div>
        </div>

        <div className="segmented" style={{ marginBottom: 12 }}>
          <button type="button" className={wagenFilter === 'alle' ? 'is-active' : ''} onClick={() => setWagenFilter('alle')}>Alle auto's</button>
          {VEHICLES.map(v => (
            <button type="button" key={v.id} className={wagenFilter === v.id ? 'is-active' : ''} onClick={() => setWagenFilter(v.id)}>
              <span className="dot" style={{ background: v.kleur }} />{v.variant}
            </button>
          ))}
        </div>

        <div className="panel">
          {loading ? <div className="empty">Laden…</div> : dagen.map(dag => {
            const items = week.filter(b => b.datum === dag && (wagenFilter === 'alle' || b.wagen === wagenFilter))
            const dagBlocks = zichtbareWagens.map(v => [v, getBlock(blocks, v.id, dag)]).filter(([, b]) => b)
            const cls = `day-row${dag === today ? ' is-today' : ''}${dag < today ? ' is-past' : ''}`
            return (
              <div key={dag} className={cls}>
                <div className="day-label">
                  {formatDag(dag)}
                  {dag === today && <span className="tag tag-green">Vandaag</span>}
                </div>
                <div className="day-items">
                  {dagBlocks.map(([v, b]) => (
                    <div key={`blok-${v.id}`} className="entry">
                      <span className="entry-time muted">Hele dag</span>
                      <VehicleLabel vehicle={v} />
                      <span className="tag tag-red">Niet beschikbaar{b.reden ? ` · ${b.reden}` : ''}</span>
                    </div>
                  ))}
                  {items.map(b => (
                    <div key={b.id} className="entry">
                      <span className="entry-time">{formatTijd(b.van)}–{formatTijd(b.tot)}</span>
                      <VehicleLabel vehicle={getVehicle(b.wagen)} />
                      <span className="muted">{b.naam}</span>
                    </div>
                  ))}
                  {items.length === 0 && dagBlocks.length === 0 && <span className="muted">Geen reserveringen</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
