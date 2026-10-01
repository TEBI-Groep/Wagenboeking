// Gedeelde opmaak voor de aanmeldschermen (gebruiker en beheer)
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <img src="/logo.png" alt="TEBI Bestratingsmaterialen" className="auth-logo" />
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-sub">{subtitle}</p>}
        {children}
      </div>
      <div className="auth-foot">
        {footer ?? `© ${new Date().getFullYear()} TEBI Bestratingsmaterialen`}
      </div>
    </div>
  )
}
