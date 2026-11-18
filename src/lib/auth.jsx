// Inlogstatus voor de hele app. Gebruikers staan alleen in Supabase Authentication:
// naam = user_metadata.naam (zelf ingevuld), rol = app_metadata.rol (opgehaald via mijn_rol()).
// Dit is alleen voor de weergave; de echte beveiliging zit in de database (supabase/beveiliging.sql).
import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from './supabase'

export const ROLBEHEERDER = 'it@tebi.nl'

const AuthContext = createContext(null)

const LEEG = { laden: false, session: null, email: null, profiel: null, isBeheerder: false, magRollenWijzigen: false }

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...LEEG, laden: true })

  async function laad(session) {
    if (!session) { setState(LEEG); return }
    const email = session.user.email?.toLowerCase() ?? null
    const { data: rol } = await supabase.rpc('mijn_rol')
    const profiel = { id: session.user.id, email, naam: session.user.user_metadata?.naam || '', rol: rol || 'algemeen' }
    setState({
      laden: false,
      session,
      email,
      profiel,
      isBeheerder: profiel?.rol === 'beheerder',
      magRollenWijzigen: email === ROLBEHEERDER,
    })
  }

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Geen supabase-aanroepen direct in deze callback (kan vastlopen); daarom via setTimeout.
      if (event === 'TOKEN_REFRESHED') setState(s => ({ ...s, session }))
      else setTimeout(() => laad(session), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const waarde = { ...state, herlaad: async () => laad((await supabase.auth.getSession()).data.session) }
  return <AuthContext.Provider value={waarde}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export async function uitloggen() {
  await supabase.auth.signOut()
}

// Pagina alleen tonen als iemand is ingelogd en een profiel met naam heeft.
export function VereistLogin({ children, beheerder = false }) {
  const auth = useAuth()
  if (auth.laden) return null
  if (!auth.session || !auth.profiel?.naam) return <Navigate to="/start" replace />
  if (beheerder && !auth.isBeheerder) {
    return (
      <div className="shell">
        <div className="notice notice-error">Je hebt geen beheerrechten.</div>
      </div>
    )
  }
  return children
}
