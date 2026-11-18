import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: wachtwoord,
    })

    if (error) {
      setError('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.')
      setLoading(false)
      return
    }

    navigate('/admin')
  }

  return (
    <AuthShell
      title="Beheer"
      subtitle="Log in om reserveringen en blokkades te beheren."
      footer={<Link to="/">Terug naar reserveren</Link>}
    >
      {error && <div className="notice notice-error">{error}</div>}
      <form className="stack" onSubmit={handleLogin}>
        <label className="field">
          <span className="field-label">E-mailadres</span>
          <input className="input" type="email" placeholder="admin@tebi.nl" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="username" />
        </label>
        <label className="field">
          <span className="field-label">Wachtwoord</span>
          <input className="input" type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
    </AuthShell>
  )
}
