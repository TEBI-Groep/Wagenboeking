import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const LINKS = [
  { to: '/', label: 'Reserveren' },
  { to: '/mijn-boekingen', label: 'Mijn boekingen' },
  { to: '/admin', label: 'Beheer', admin: true },
]

export default function Navbar() {
  const { isBeheerder } = useAuth()
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <img src="/logo.png" alt="TEBI Bestratingsmaterialen" />
          <span className="nav-app">Wagenboeking</span>
        </Link>
        <nav className="nav-links">
          {LINKS.filter(link => !link.admin || isBeheerder).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
