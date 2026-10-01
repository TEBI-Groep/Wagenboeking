import { getVehicleName } from '../lib/vehicles'
import Plate from './Plate'

// Compacte weergave van een auto: kleurstip, naam, variant en optioneel het kenteken
export default function VehicleLabel({ vehicle, plate = false }) {
  return (
    <span className="vlabel">
      <span className="dot" style={{ background: vehicle.kleur }} />
      <span className="vlabel-name">
        {getVehicleName(vehicle)} <span className="vlabel-variant">· {vehicle.variant}</span>
      </span>
      {plate && <Plate kenteken={vehicle.kenteken} />}
    </span>
  )
}
