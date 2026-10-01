import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function Start() {
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Als gebruiker al opgeslagen is, redirect naar boeken
    if (localStorage.getItem('tebi_user')) navigate('/')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!naam.trim() || !email.trim()) {
      setError('Vul je naam en e-mailadres in.')
      return
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Vul een geldig e-mailadres in.')
      return
    }

    setLoading(true)

    // Sla op in Supabase (upsert op email)
    const { error: dbError } = await supabase
      .from('users')
      .upsert([{ naam: naam.trim(), email: email.trim().toLowerCase() }], { onConflict: 'email' })

    if (dbError) {
      setError('Er is iets misgegaan: ' + dbError.message)
      setLoading(false)
      return
    }

    localStorage.setItem('tebi_user', JSON.stringify({
      naam: naam.trim(),
      email: email.trim().toLowerCase(),
    }))

    navigate('/')
  }

  return (
    <AuthShell
      title="Wagenboeking"
      subtitle="Reserveer een bedrijfswagen. Vul je naam en zakelijk e-mailadres in; daar komt de bevestiging naartoe."
    >
      {error && <div className="notice notice-error">{error}</div>}
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Naam</span>
          <input className="input" type="text" placeholder="Voornaam Achternaam" value={naam} onChange={e => setNaam(e.target.value)} required autoFocus autoComplete="name" />
        </label>
        <label className="field">
          <span className="field-label">Zakelijk e-mailadres</span>
          <input className="input" type="email" placeholder="naam@tebi.nl" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Bezig…' : 'Doorgaan'}
        </button>
      </form>
    </AuthShell>
  )
}
