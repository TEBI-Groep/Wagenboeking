import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getVehicleName } from '../lib/vehicles'
import { formatDatumLang as formatDatum, formatDatumKort, getTodayString } from '../lib/date'

export default function Admin() {
  const [blocks, setBlocks] = useState([])
  const [blockWagen, setBlockWagen] = useState(VEHICLES[0].id)
  const [blockVan, setBlockVan] = useState(getTodayString())
  const [blockTot, setBlockTot] = useState('')
  const [blockReden, setBlockReden] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockMelding, setBlockMelding] = useState('')
  const [boekingen, setBoekingen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('aankomend')
  const [wagenFilter, setWagenFilter] = useState('alle')
  const [authLoading, setAuthLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!authLoading) fetchAlles()
  }, [filter, authLoading])

  useEffect(() => {
    if (!authLoading) fetchBlocks()
  }, [authLoading])

  async function fetchBlocks() {
    const { data, error } = await supabase
      .from('vehicle_blocks')
      .select('*')
      .gte('tot_datum', getTodayString())
      .order('van_datum', { ascending: true })
    if (error) setError('Fout bij ophalen blokkades: ' + error.message)
    else setBlocks(data || [])
  }

  async function blokkeer(e) {
    e.preventDefault()
    setBlockMelding('')
    if (!blockVan || !blockTot) { setBlockMelding('Vul een van- en tot-datum in.'); return }
    if (blockTot < blockVan) { setBlockMelding('Einddatum moet op of na de begindatum liggen.'); return }

    setBlockSaving(true)
    const { error } = await supabase.from('vehicle_blocks').insert([{
      wagen: blockWagen, van_datum: blockVan, tot_datum: blockTot, reden: blockReden.trim() || null,
    }])
    setBlockSaving(false)
    if (error) { setBlockMelding('Blokkeren mislukt: ' + error.message); return }

    // Bestaande boekingen blijven staan; waarschuw de admin zodat die handmatig opgelost worden.
    const conflicten = boekingen.filter(b => b.wagen === blockWagen && b.datum >= blockVan && b.datum <= blockTot)
    if (conflicten.length > 0) {
      setBlockMelding(`Let op: er staan al ${conflicten.length} boeking(en) in deze periode. Die blijven bestaan, verwijder ze zelf en informeer de boekers.`)
    }
    setBlockTot('')
    setBlockReden('')
    fetchBlocks()
  }

  async function deblokkeer(id) {
    if (!confirm('Blokkade opheffen?')) return
    const { error } = await supabase.from('vehicle_blocks').delete().eq('id', id)
    if (error) alert('Opheffen mislukt: ' + error.message)
    else setBlocks(prev => prev.filter(b => b.id !== id))
  }

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/admin/login')
    }
    setAuthLoading(false)
  }

  async function fetchAlles() {
    setLoading(true)
    setError('')

    let query = supabase
      .from('bookings')
      .select('*')
      .order('datum', { ascending: true })
      .order('van', { ascending: true })

    if (filter === 'aankomend') {
      query = query.gte('datum', new Date().toISOString().split('T')[0])
    }

    const { data, error } = await query
    if (error) setError('Fout bij ophalen: ' + error.message)
    else setBoekingen(data || [])
    setLoading(false)
  }

  async function annuleer(id) {
    if (!confirm('Boeking verwijderen?')) return
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) alert('Verwijderen mislukt: ' + error.message)
    else setBoekingen(prev => prev.filter(b => b.id !== id))
  }

  async function uitloggen() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const boekingenGefilterd = wagenFilter === 'alle' ? boekingen : boekingen.filter(b => b.wagen === wagenFilter)

  const grouped = boekingenGefilterd.reduce((acc, b) => {
    if (!acc[b.datum]) acc[b.datum] = []
    acc[b.datum].push(b)
    return acc
  }, {})

  const today = new Date().toISOString().split('T')[0]

  if (authLoading) return null

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Admin</h1>
            <p className="page-subtitle">Overzicht van alle wagenboeking reserveringen.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={uitloggen}>Uitloggen</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Auto blokkeren</h2>
        <form onSubmit={blokkeer} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="block-wagen">Auto</label>
            <select id="block-wagen" value={blockWagen} onChange={e => setBlockWagen(e.target.value)}>
              {VEHICLES.map(v => (
                <option key={v.id} value={v.id}>{getVehicleName(v)} · {v.variant} ({v.kenteken})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="block-van">Van</label>
            <input id="block-van" type="date" value={blockVan} onChange={e => setBlockVan(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="block-tot">Tot en met</label>
            <input id="block-tot" type="date" value={blockTot} min={blockVan} onChange={e => setBlockTot(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label htmlFor="block-reden">Reden (optioneel)</label>
            <input id="block-reden" type="text" value={blockReden} placeholder="bijv. onderhoud" onChange={e => setBlockReden(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={blockSaving}>
            {blockSaving ? 'Bezig...' : 'Blokkeren'}
          </button>
        </form>
        {blockMelding && <div className="alert alert-info" style={{ marginTop: 12 }}>{blockMelding}</div>}

        {blocks.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blocks.map(b => {
              const v = getVehicle(b.wagen)
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.kleur, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getVehicleName(v)} · {v.variant}</span>
                  <span className="badge badge-red">
                    {formatDatumKort(b.van_datum)} t/m {formatDatumKort(b.tot_datum)}
                  </span>
                  {b.reden && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{b.reden}</span>}
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => deblokkeer(b.id)}>Opheffen</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${filter === 'aankomend' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('aankomend')}>
          Aankomend
        </button>
        <button className={`btn btn-sm ${filter === 'alle' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('alle')}>
          Alle boekingen
        </button>
        <button className="btn btn-sm btn-ghost" onClick={fetchAlles} style={{ marginLeft: 'auto' }}>
          ↻ Vernieuwen
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          className="btn btn-sm"
          onClick={() => setWagenFilter('alle')}
          style={{
            border: wagenFilter === 'alle' ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
            background: wagenFilter === 'alle' ? 'var(--text)' : 'var(--surface)',
            color: wagenFilter === 'alle' ? '#fff' : 'var(--text)',
          }}
        >
          Alle auto's
        </button>
        {VEHICLES.map(v => {
          const actief = wagenFilter === v.id
          return (
            <button
              key={v.id}
              className="btn btn-sm"
              onClick={() => setWagenFilter(v.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                border: actief ? `1.5px solid ${v.kleur}` : '1.5px solid var(--border)',
                background: actief ? `${v.kleur}14` : 'var(--surface)',
                color: actief ? v.kleur : 'var(--text)',
                fontWeight: actief ? 700 : 500,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.kleur, display: 'inline-block' }} />
              {v.variant}
            </button>
          )
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="empty-state"><p>Laden...</p></div>}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>Geen boekingen gevonden.</p>
          </div>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([datum, items]) => (
        <div key={datum} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--dark)' }}>
              {formatDatum(datum)}
            </span>
            {datum === today && <span className="badge badge-green">Vandaag</span>}
            {datum < today && <span className="badge badge-gray">Verleden</span>}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Auto</th>
                  <th>Tijdslot</th>
                  <th>Naam</th>
                  <th>E-mail</th>
                  <th>Geboekt op</th>
                  <th style={{ textAlign: 'right' }}>Actie</th>
                </tr>
              </thead>
              <tbody>
                {items.map(b => {
                  const v = getVehicle(b.wagen)
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.kleur, display: 'inline-block', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                              {getVehicleName(v)} <span style={{ color: v.kleur }}>· {v.variant}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {v.kenteken}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${v.kleur}14`, color: v.kleur, border: `1px solid ${v.kleur}33` }}>
                          {b.van ? `${b.van.slice(0,5)} – ${b.tot.slice(0,5)}` : b.tijdslot}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.naam}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.email || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString('nl-NL')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => annuleer(b.id)}>Verwijder</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}