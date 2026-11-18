import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, ROLBEHEERDER } from '../lib/auth'
import { formatDag } from '../lib/date'
import ConfirmButton from './ConfirmButton'

// Tabblad Gebruikers in Beheer. Gebruikers zijn de accounts in Supabase Authentication.
// Een account ontstaat bij de eerste inlog (alleen @tebi.nl en @gardenlux.nl).
// Beheerders: lijst bekijken en accounts verwijderen. Alleen it@tebi.nl: rollen wijzigen.
// De database controleert dit ook (functies gebruikers_lijst, zet_rol, verwijder_gebruiker).
export default function Gebruikers({ onAantal }) {
  const auth = useAuth()
  const [lijst, setLijst] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoek, setZoek] = useState('')

  useEffect(() => { laad() }, [])

  async function laad() {
    setLoading(true)
    const { data, error } = await supabase.rpc('gebruikers_lijst')
    if (error) setError('Fout bij ophalen: ' + error.message)
    else { setLijst(data || []); onAantal?.(data?.length ?? 0) }
    setLoading(false)
  }

  async function wijzigRol(id, rol) {
    setError('')
    const { error } = await supabase.rpc('zet_rol', { p_user: id, p_rol: rol })
    if (error) { setError('Rol wijzigen mislukt: ' + error.message); return }
    setLijst(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
  }

  async function verwijder(id) {
    setError('')
    const { error } = await supabase.rpc('verwijder_gebruiker', { p_user: id })
    if (error) { setError('Verwijderen mislukt: ' + error.message); return }
    laad()
  }

  const term = zoek.trim().toLowerCase()
  const zichtbaar = lijst.filter(u => !term || u.naam?.toLowerCase().includes(term) || u.email.includes(term))

  return (
    <>
      {error && <div className="notice notice-error">{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Gebruikers</h2>
          <input className="input input-sm" type="search" placeholder="Zoeken…" value={zoek} onChange={e => setZoek(e.target.value)} style={{ maxWidth: 220 }} />
        </div>
        <div className="panel-body muted" style={{ fontSize: '0.84rem', paddingTop: 0 }}>
          Collega's met een @tebi.nl- of @gardenlux.nl-adres krijgen automatisch een account bij hun eerste inlog.
          {!auth.magRollenWijzigen && ' Rollen wijzigen kan alleen it@tebi.nl.'}
        </div>
        {loading ? <div className="empty">Laden…</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>E-mail</th>
                  <th>Rol</th>
                  <th className="hide-sm">Laatst ingelogd</th>
                  <th className="actions"><span className="hide-sm">Actie</span></th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map(u => {
                  const vast = u.email === ROLBEHEERDER
                  return (
                    <tr key={u.id}>
                      <td>{u.naam || <span className="muted">Nog niet ingesteld</span>}</td>
                      <td className="muted">{u.email}</td>
                      <td>
                        {auth.magRollenWijzigen && !vast ? (
                          <select className="select select-sm" value={u.rol} onChange={e => wijzigRol(u.id, e.target.value)} aria-label={`Rol van ${u.email}`}>
                            <option value="algemeen">Algemeen</option>
                            <option value="beheerder">Beheerder</option>
                          </select>
                        ) : (
                          <span className={`tag${u.rol === 'beheerder' ? ' tag-amber' : ''}`}>{u.rol === 'beheerder' ? 'Beheerder' : 'Algemeen'}</span>
                        )}
                      </td>
                      <td className="hide-sm muted num">{u.laatst_ingelogd ? formatDag(u.laatst_ingelogd.slice(0, 10)) : 'Nooit'}</td>
                      <td className="actions">
                        {!vast && u.id !== auth.profiel?.id && (
                          <ConfirmButton onConfirm={() => verwijder(u.id)}>Verwijderen</ConfirmButton>
                        )}
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
  )
}
