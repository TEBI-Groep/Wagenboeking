import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth, uitloggen } from '../lib/auth'
import AuthShell from '../components/AuthShell'

// Inloggen en account aanmaken met een code per e-mail (geen wachtwoord).
// Inloggen:          e-mailadres -> code per mail -> code invoeren.
// Account aanmaken:  naam + e-mailadres -> code per mail ter bevestiging -> code invoeren.
// Alleen @tebi.nl en @gardenlux.nl; dat controleert de database bij het aanmaken van het account.

// Gegevens uit de oude versie van de app (zonder login), om het formulier vooraf in te vullen.
function oudeGebruiker() {
  try { return JSON.parse(localStorage.getItem('tebi_user')) || {} } catch { return {} }
}

export default function Start() {
  const auth = useAuth()
  const navigate = useNavigate()
  const oud = oudeGebruiker()
  // Wie de oude app al gebruikte (gegevens in de browser), heeft nog geen account: direct naar aanmaken.
  const [modus, setModus] = useState(oud.email ? 'aanmaken' : 'inloggen')
  const [stap, setStap] = useState('email')
  const [email, setEmail] = useState(oud.email || '')
  const [code, setCode] = useState('')
  const [naam, setNaam] = useState(oud.naam || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [melding, setMelding] = useState('')

  // Ingelogd met naam: door naar reserveren. Ingelogd zonder naam (eerste keer): naam vragen.
  useEffect(() => {
    if (auth.laden || !auth.session) return
    if (auth.profiel?.naam) {
      localStorage.removeItem('tebi_user')
      navigate('/', { replace: true })
    } else {
      setStap('naam')
    }
  }, [auth.laden, auth.session, auth.profiel])

  async function stuurCode(e) {
    e?.preventDefault()
    setError(''); setMelding('')
    const adres = email.trim().toLowerCase()
    if (modus === 'aanmaken' && !naam.trim()) { setError('Vul je naam in.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adres)) { setError('Vul een geldig e-mailadres in.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: adres,
      options: modus === 'aanmaken'
        ? { shouldCreateUser: true, data: { naam: naam.trim() } }
        : { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) {
      if (error.status === 429) setError('Er zijn te veel codes aangevraagd. Wacht een minuut en probeer het opnieuw.')
      // Inloggen met een adres zonder account.
      else if (/signups not allowed|otp_disabled|user not found/i.test(error.message + ' ' + (error.code || ''))) {
        setError('Er is nog geen account met dit e-mailadres. Maak eerst een account aan.')
        setModus('aanmaken')
      }
      // De database weigert accounts voor andere domeinen ("Database error saving new user").
      else if (/database error/i.test(error.message)) setError('Alleen e-mailadressen van TEBI en Gardenlux kunnen een account aanmaken.')
      else setError('De code kon niet worden verstuurd. Probeer het opnieuw.')
      return
    }
    setEmail(adres)
    setCode('')
    setStap('code')
    setMelding(modus === 'aanmaken'
      ? `We hebben een bevestigingscode gestuurd naar ${adres}.`
      : `We hebben een code gestuurd naar ${adres}.`)
  }

  async function controleerCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setLoading(false)
    if (error) { setError('De code klopt niet of is verlopen. Vraag een nieuwe code aan.'); return }
    // De AuthProvider pakt de nieuwe sessie op; het effect hierboven stuurt door.
  }

  async function slaNaamOp(e) {
    e.preventDefault()
    setError('')
    if (!naam.trim()) { setError('Vul je naam in.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ data: { naam: naam.trim() } })
    setLoading(false)
    if (error) { setError('Opslaan mislukt. Probeer het opnieuw.'); return }
    await auth.herlaad()
  }

  async function anderAdres() {
    await uitloggen()
    setStap('email'); setCode(''); setError(''); setMelding('')
  }

  function wisselModus(nieuw) {
    setModus(nieuw); setError(''); setMelding('')
  }

  if (auth.laden) return null

  return (
    <AuthShell
      title={stap === 'email' && modus === 'aanmaken' ? 'Account aanmaken' : 'Wagenboeking'}
      subtitle={stap === 'naam'
        ? 'Eén keer instellen: onder welke naam wil je reserveren?'
        : modus === 'aanmaken'
          ? 'Vul je naam en zakelijk e-mailadres in. Je krijgt een code per mail om je account te bevestigen.'
          : 'Log in met je e-mailadres. Je krijgt een code per mail; een wachtwoord is niet nodig.'}
    >
      {error && <div className="notice notice-error">{error}</div>}
      {melding && !error && <div className="notice notice-success">{melding}</div>}

      {stap === 'email' && (
        <form className="stack" onSubmit={stuurCode}>
          {modus === 'aanmaken' && oud.email && (
            <div className="notice notice-info">De Wagenboeking heeft een nieuwe, veiligere inlog. Maak eenmalig je account aan; je boekingen blijven staan.</div>
          )}
          {modus === 'aanmaken' && (
            <label className="field">
              <span className="field-label">Naam</span>
              <input className="input" type="text" placeholder="Voornaam Achternaam" value={naam} onChange={e => setNaam(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span className="field-label">{modus === 'aanmaken' ? 'Zakelijk e-mailadres' : 'E-mailadres'}</span>
            <input className="input" type="email" placeholder="naam@tebi.nl" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Bezig…' : modus === 'aanmaken' ? 'Account aanmaken' : 'Stuur code'}
          </button>
          <div className="row">
            {modus === 'inloggen'
              ? <><span className="muted">Nog geen account?</span><button type="button" className="link" onClick={() => wisselModus('aanmaken')}>Account aanmaken</button></>
              : <><span className="muted">Al een account?</span><button type="button" className="link" onClick={() => wisselModus('inloggen')}>Inloggen</button></>}
          </div>
        </form>
      )}

      {stap === 'code' && (
        <form className="stack" onSubmit={controleerCode}>
          <label className="field">
            <span className="field-label">Code uit de mail</span>
            <input className="input num" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Bezig…' : modus === 'aanmaken' ? 'Bevestigen' : 'Inloggen'}
          </button>
          <div className="row">
            <button type="button" className="link" onClick={stuurCode} disabled={loading}>Nieuwe code sturen</button>
            <span className="muted">·</span>
            <button type="button" className="link" onClick={() => { setStap('email'); setError(''); setMelding('') }}>Ander e-mailadres</button>
          </div>
        </form>
      )}

      {stap === 'naam' && (
        <form className="stack" onSubmit={slaNaamOp}>
          <label className="field">
            <span className="field-label">Naam</span>
            <input className="input" type="text" placeholder="Voornaam Achternaam" value={naam} onChange={e => setNaam(e.target.value)} required autoFocus autoComplete="name" />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Bezig…' : 'Doorgaan'}
          </button>
          <div className="row">
            <span className="muted">Ingelogd als {auth.email}</span>
            <span className="muted">·</span>
            <button type="button" className="link" onClick={anderAdres}>Ander e-mailadres</button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
