import { useState, useMemo } from 'react'
import { getVehicle, VEHICLES } from '../lib/vehicles'
import { MAANDEN, DAGEN, toDateStringYMD, getTodayString } from '../lib/date'
import { ChevronLeft, ChevronRight } from './Icons'

// Maandkalender als datumkiezer. Stipjes tonen welke auto's op een dag gereserveerd zijn.
// isDisabled(datum): dag niet kiesbaar. isBlocked(datum): gekozen auto staat die dag geblokkeerd.
export default function MonthCalendar({ bookings, selectedDate, onSelectDate, isDisabled, isBlocked }) {
  const initial = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth()) // 0-indexed
  const today = getTodayString()

  const wagensPerDag = useMemo(() => {
    const map = {}
    for (const b of bookings || []) {
      if (!map[b.datum]) map[b.datum] = new Set()
      map[b.datum].add(b.wagen)
    }
    return map
  }, [bookings])

  const cells = useMemo(() => {
    // maandag = 0 ... zondag = 6
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const result = []
    for (let i = 0; i < firstWeekday; i++) result.push(null)
    for (let d = 1; d <= daysInMonth; d++) result.push(d)
    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [viewYear, viewMonth])

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function naarVandaag() {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    if (!isDisabled?.(today)) onSelectDate?.(today)
  }

  return (
    <div className="panel cal">
      <div className="cal-head">
        <div className="cal-month">{MAANDEN[viewMonth]} {viewYear}</div>
        <div className="cal-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={naarVandaag}>Vandaag</button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftMonth(-1)} aria-label="Vorige maand"><ChevronLeft /></button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftMonth(1)} aria-label="Volgende maand"><ChevronRight /></button>
        </div>
      </div>

      <div className="cal-grid">
        {DAGEN.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />
          const dateStr = toDateStringYMD(viewYear, viewMonth, day)
          const blocked = isBlocked?.(dateStr)
          const wagens = [...(wagensPerDag[dateStr] || [])]
          const cls = [
            'cal-day',
            dateStr === today && 'is-today',
            dateStr === selectedDate && 'is-selected',
            blocked && 'is-blocked',
          ].filter(Boolean).join(' ')

          return (
            <button
              type="button"
              key={idx}
              className={cls}
              disabled={isDisabled?.(dateStr)}
              onClick={() => onSelectDate?.(dateStr)}
              title={blocked ? 'Deze auto is dan niet beschikbaar' : undefined}
            >
              <span>{day}</span>
              <span className="cal-dots">
                {wagens.slice(0, 4).map(w => <span key={w} className="dot" style={{ background: getVehicle(w).kleur }} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        {VEHICLES.map(v => (
          <span key={v.id}><span className="dot" style={{ background: v.kleur }} />{v.variant}</span>
        ))}
      </div>
    </div>
  )
}
