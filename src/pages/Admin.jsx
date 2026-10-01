import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getVehicleName } from '../lib/vehicles'
import { getTodayString, addDays, formatDatumLang, formatDag, formatTijd } from '../lib/date'
import DayTimeline from '../components/DayTimeline'
import VehicleLabel from '../components/VehicleLabel'
import ConfirmButton from '../components/ConfirmButton'
import { ChevronLeft, ChevronRight, Refresh } from '../components/Icons'

export default function Admin() {
  const today = getTodayString()
  const navigate = useNavigate()
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('boekingen')
  const [error, setError] = useState('')

  // Boekingen
  const [boekingen, setBoekingen] = useState([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('aankomend')
  const [wagenFilter, setWagenFilter] = useState('alle')
  const [zoek, setZoek] = useState('')
  const [dag, setDag] = useState(today)

  // Blokkades
  const [blocks, setBlocks] = useState([])
  const [blockWagen, setBlockWagen] = useState(VEHICLES[0].id)
  const [blockVan, setBlockVan] = useState(today)
  const [blockTot, setBlockTot] = useState('')
  const [blockReden, setBlockReden] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockMelding, setBlockMelding] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!authLoading) vernieuwen()
  }, [authLoading])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/admin/login')
      return
    }
    setAuthLoading(false)
  }

  function vernieuwen() {
    fetchBoekingen()
    fetchBlocks()
  }

  // Alle boekingen in één keer ophalen; filteren gebeurt in de browser (het gaat om een paar honderd regels).
  async function fetchBoekingen() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('datum', { ascending: true })
      .order('van', { ascending: true })
    if (error) setError('Fout bij ophalen: ' + error.message)
    else setBoekingen(data || [])
    setLoading(false)
  }

  async function fetchBlocks() {
    const { data, error } = await supabase
      .from('vehicle_blocks')
      .select('*')
      .gte('tot_datum', getTodayString())
      .order('van_datum', { ascending: true })
    if (error) setError('Fout bij ophalen blokkades: ' + error.message)
    else setBlocks(data || [])
  }

  async function verwijderBoeking(id) {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) setError('Verwijderen mislukt: ' + error.message)
    else setBoekingen(prev => prev.filter(b => b.id !== id))
  }

  async function blokkeer(e) {
    e.preventDefault()
    setBlockMelding('')
    if (!blockVan || !blockTot) { setBlockMelding('Vul een begin- en einddatum in.'); return }
    if (blockTot < blockVan) { setBlockMelding('De einddatum moet op of na de begindatum liggen.'); return }

    setBlockSaving(true)
    const { error } = await supabase.from('vehicle_blocks').insert([{
      wagen: blockWagen, van_datum: blockVan, tot_datum: blockTot, reden: blockReden.trim() || null,
    }])
    setBlockSaving(false)
    if (error) { setBlockMelding('Blokkeren mislukt: ' + error.message); return }

    // Bestaande boekingen blijven staan; de admin lost ze zelf op en informeert de boekers.
    const aantal = conflicten({ wagen: blockWagen, van_datum: blockVan, tot_datum: blockTot }).length
    setBlockMelding(aantal > 0
      ? `Blokkade opgeslagen. Let op: er staan ${aantal} boeking(en) in deze periode. Die blijven bestaan; verwijder ze zelf en informeer de boekers.`
      : 'Blokkade opgeslagen.')
    setBlockTot('')
    setBlockReden('')
    fetchBlocks()
  }

  async function deblokkeer(id) {
    const { error } = await supabase.from('vehicle_blocks').delete().eq('id', id)
    if (error) setError('Opheffen mislukt: ' + error.message)
    else setBlocks(prev => prev.filter(b => b.id !== id))
  }

  async function uitloggen() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  // Aankomende boekingen die binnen een blokkade vallen
  function conflicten(block) {
    return boekingen.filter(b =>
      b.wagen === block.wagen && b.datum >= block.van_datum && b.datum <= block.tot_datum && b.datum >= today
    )
  }

  function toonConflicten(block) {
    setTab('boekingen')
    setPeriode('aankomend')
    setWagenFilter(block.wagen)
    setZoek('')
  }

  if (authLoading) return null

  const zoekTerm = zoek.trim().toLowerCase()
  const gefilterd = boekingen.filter(b =>
    (periode === 'alle' || (periode === 'aankomend' ? b.datum >= today : b.datum < today)) &&
    (wagenFilter === 'alle' || b.wagen === wagenFilter) &&
    (!zoekTerm || b.naam?.toLowerCase().includes(zoekTerm) || b.email?.toLowerCase().includes(zoekTerm))
  )

  const groepen = []
  for (const b of gefilterd) {
    const laatste = groepen[groepen.length - 1]
    if (laatste && laatste.datum === b.datum) laatste.items.push(b)
    else groepen.push({ datum: b.datum, items: [b] })
  }
  if (periode === 'verleden') groepen.reverse()

  const actieveBlocks = blocks.filter(b => b.van_datum <= today).length

  return (
    <div className="shell">
      <header className="page-head">
        <div>
          <h1 className="page-title">Beheer</h1>
          <p className="page-sub">Reserveringen en beschikbaarheid van de bedrijfswagens.</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={vernieuwen}><Refresh /> Vernieuwen</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={uitloggen}>Uitloggen</button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'boekingen'} className={`tab${tab === 'boekingen' ? ' is-active' : ''}`} onClick={() => setTab('boekingen')}>
          Boekingen <span className="tab-count num">{boekingen.filter(b => b.datum >= today).length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'blokkades'} className={`tab${tab === 'blokkades' ? ' is-active' : ''}`} onClick={() => setTab('blokkades')}>
          Blokkades <span className="tab-count num">{blocks.length}</span>
        </button>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      {tab === 'boekingen' && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title"><span className="cap">{formatDatumLang(dag)}</span></h2>
              <div className="cal-nav">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDag(today)} disabled={dag === today}>Vandaag</button>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDag(addDays(dag, -1))} aria-label="Vorige dag"><ChevronLeft /></button>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDag(addDays(dag, 1))} aria-label="Volgende dag"><ChevronRight /></button>
              </div>
            </div>
            <div className="panel-body">
              <DayTimeline date={dag} bookings={boekingen} blocks={blocks} />
            </div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <input
                className="input input-sm"
                type="search"
                placeholder="Zoek op naam of e-mail"
                value={zoek}
                onChange={e => setZoek(e.target.value)}
                aria-label="Zoeken"
              />
              <select className="select select-sm" value={periode} onChange={e => setPeriode(e.target.value)} aria-label="Periode">
                <option value="aankomend">Aankomend</option>
                <option value="verleden">Verleden</option>
                <option value="alle">Alle boekingen</option>
              </select>
              <select className="select select-sm" value={wagenFilter} onChange={e => setWagenFilter(e.target.value)} aria-label="Auto">
                <option value="alle">Alle auto's</option>
                {VEHICLES.map(v => <option key={v.id} value={v.id}>{getVehicleName(v)} · {v.variant}</option>)}
              </select>
              <span className="toolbar-spacer" />
              <span className="muted num" style={{ fontSize: '0.84rem' }}>
                {gefilterd.length} {gefilterd.length === 1 ? 'boeking' : 'boekingen'}
              </span>
            </div>

            {loading && <div className="empty">Laden…</div>}
            {!loading && gefilterd.length === 0 && <div className="empty">Geen boekingen gevonden.</div>}

            {!loading && gefilterd.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tijd</th>
                      <th>Auto</th>
                      <th>Naam</th>
                      <th className="hide-sm">E-mail</th>
                      <th className="hide-sm">Geboekt op</th>
                      <th className="actions"><span className="hide-sm">Actie</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groepen.map(g => [
                      <tr key={`g-${g.datum}`} className="group-row">
                        <td colSpan={6}>
                          <span className="cap">{formatDatumLang(g.datum)}</span>
                          {g.datum === today && <span className="tag tag-green" style={{ marginLeft: 8 }}>Vandaag</span>}
                        </td>
                      </tr>,
                      ...g.items.map(b => (
                        <tr key={b.id}>
                          <td className="num" style={{ whiteSpace: 'nowrap' }}>
                            {b.van ? `${formatTijd(b.van)}–${formatTijd(b.tot)}` : b.tijdslot}
                          </td>
                          <td><VehicleLabel vehicle={getVehicle(b.wagen)} /></td>
                          <td className="strong">{b.naam}</td>
                          <td className="muted hide-sm">{b.email || '—'}</td>
                          <td className="muted num hide-sm">{new Date(b.created_at).toLocaleDateString('nl-NL')}</td>
                          <td className="actions">
                            <ConfirmButton onConfirm={() => verwijderBoeking(b.id)}>Verwijderen</ConfirmButton>
                          </td>
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'blokkades' && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Nieuwe blokkade</h2>
              <span className="muted" style={{ fontSize: '0.84rem' }}>De auto is dan op die dagen niet te reserveren.</span>
            </div>
            <form className="panel-body" onSubmit={blokkeer}>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Auto</span>
                  <select className="select" value={blockWagen} onChange={e => setBlockWagen(e.target.value)}>
                    {VEHICLES.map(v => (
                      <option key={v.id} value={v.id}>{getVehicleName(v)} · {v.variant} ({v.kenteken})</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Van</span>
                  <input className="input" type="date" value={blockVan} onChange={e => setBlockVan(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="field-label">Tot en met</span>
                  <input className="input" type="date" value={blockTot} min={blockVan} onChange={e => setBlockTot(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="field-label">Reden (optioneel)</span>
                  <input className="input" type="text" value={blockReden} placeholder="Bijv. onderhoud" onChange={e => setBlockReden(e.target.value)} />
                </label>
                <button type="submit" className="btn btn-primary" disabled={blockSaving}>
                  {blockSaving ? 'Bezig…' : 'Blokkeren'}
                </button>
              </div>
              {blockMelding && <div className="notice notice-info" style={{ marginTop: 16, marginBottom: 0 }}>{blockMelding}</div>}
            </form>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Actieve en geplande blokkades</h2>
              <span className="muted num" style={{ fontSize: '0.84rem' }}>{actieveBlocks} actief</span>
            </div>
            {blocks.length === 0 ? (
              <div className="empty">Er zijn geen blokkades. Alle auto's zijn te reserveren.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Auto</th>
                      <th>Periode</th>
                      <th className="hide-sm">Reden</th>
                      <th>Status</th>
                      <th className="hide-sm">Boekingen in periode</th>
                      <th className="actions"><span className="hide-sm">Actie</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map(b => {
                      const aantal = conflicten(b).length
                      return (
                        <tr key={b.id}>
                          <td><VehicleLabel vehicle={getVehicle(b.wagen)} plate /></td>
                          <td className="num" style={{ whiteSpace: 'nowrap' }}>{formatDag(b.van_datum)} t/m {formatDag(b.tot_datum)}</td>
                          <td className="muted hide-sm">{b.reden || '—'}</td>
                          <td>
                            {b.van_datum <= today
                              ? <span className="tag tag-red">Actief</span>
                              : <span className="tag">Gepland</span>}
                          </td>
                          <td className="hide-sm">
                            {aantal > 0
                              ? <button type="button" className="tag tag-amber" onClick={() => toonConflicten(b)}>{aantal} bekijken</button>
                              : <span className="muted">Geen</span>}
                          </td>
                          <td className="actions">
                            <ConfirmButton onConfirm={() => deblokkeer(b.id)}>Opheffen</ConfirmButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
