import { useState, useEffect } from 'react'

// Knop die om bevestiging vraagt met een tweede klik, in plaats van een browser-popup.
// Na 3 seconden zonder tweede klik valt hij terug naar de normale stand.
export default function ConfirmButton({ onConfirm, children, confirmLabel = 'Zeker weten?' }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  function handleClick() {
    if (!armed) { setArmed(true); return }
    setArmed(false)
    onConfirm()
  }

  return (
    <button type="button" className={`btn btn-sm ${armed ? 'btn-danger' : 'btn-ghost'}`} onClick={handleClick}>
      {armed ? confirmLabel : children}
    </button>
  )
}
