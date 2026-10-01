import { VEHICLES, getVehicleName, getBlock } from '../lib/vehicles'
import { formatTijd } from '../lib/date'

// Dagplanning: per auto een balk van 07:00 tot 19:00 met de reserveringen van die dag.
const START = 7
const END = 19
const LABELS = [8, 10, 12, 14, 16, 18]

function positie(tijd) {
  const [h, m] = tijd.split(':').map(Number)
  const pct = ((h + m / 60 - START) / (END - START)) * 100
  return Math.min(Math.max(pct, 0), 100)
}

function balk(van, tot) {
  const left = positie(van)
  return { left: `${left}%`, width: `${Math.max(positie(tot) - left, 0.5)}%` }
}

export default function DayTimeline({ date, bookings, blocks, selectedWagen, selection }) {
  return (
    <div className="timeline">
      {VEHICLES.map(v => {
        const block = getBlock(blocks, v.id, date)
        const items = bookings.filter(b => b.wagen === v.id && b.datum === date)
        const isSelected = selectedWagen === v.id

        return (
          <div key={v.id} className={`tl-row${isSelected ? ' is-selected' : ''}`}>
            <div className="tl-label" title={`${getVehicleName(v)} · ${v.variant}`}>
              <span className="dot" style={{ background: v.kleur }} />
              {v.variant}
            </div>
            <div className="tl-track">
              {block ? (
                <div className="tl-blocked">Niet beschikbaar{block.reden ? ` · ${block.reden}` : ''}</div>
              ) : items.map(b => (
                <div
                  key={b.id}
                  className="tl-item"
                  style={{ ...balk(b.van, b.tot), background: `${v.kleur}29`, borderLeftColor: v.kleur }}
                  title={`${formatTijd(b.van)}–${formatTijd(b.tot)} · ${b.naam}`}
                >
                  {formatTijd(b.van)}–{formatTijd(b.tot)} {b.naam}
                </div>
              ))}
              {isSelected && selection && !block && (
                <div className={`tl-selection${selection.conflict ? ' is-conflict' : ''}`} style={balk(selection.van, selection.tot)} />
              )}
            </div>
          </div>
        )
      })}
      <div className="tl-row">
        <div />
        <div className="tl-scale">
          {LABELS.map(u => (
            <span key={u} style={{ left: `${((u - START) / (END - START)) * 100}%` }}>
              {String(u).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
