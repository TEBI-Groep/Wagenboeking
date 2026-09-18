import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VEHICLES, getVehicle, getVehicleName } from '../lib/vehicles'
import { formatDatumLang as formatDatum } from '../lib/date'

export default function Admin() {
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