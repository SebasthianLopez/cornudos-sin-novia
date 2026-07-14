// Rivalidades head-to-head: en cada salida compartida gana el que sumó más
// puntos (tragos/rechazos/MVP + retos y apuestas de esa noche).
import type { DB, ID, Profile } from '../types'
import { puntosCompletosEnSalida } from './points'

export interface Rivalidad {
  rival: Profile
  ganadas: number
  perdidas: number
  empates: number
  salidasJuntos: number
}

export function rivalidadesDe(db: DB, meId: ID): Rivalidad[] {
  const res: Rivalidad[] = []
  for (const rival of db.profiles) {
    if (rival.id === meId) continue
    let ganadas = 0
    let perdidas = 0
    let empates = 0
    let juntos = 0
    for (const s of db.salidas) {
      if (!s.participantes.includes(meId) || !s.participantes.includes(rival.id)) continue
      juntos++
      const mio = puntosCompletosEnSalida(db, s.id, meId)
      const suyo = puntosCompletosEnSalida(db, s.id, rival.id)
      if (mio > suyo) ganadas++
      else if (mio < suyo) perdidas++
      else empates++
    }
    if (juntos > 0) res.push({ rival, ganadas, perdidas, empates, salidasJuntos: juntos })
  }
  res.sort((a, b) => b.salidasJuntos - a.salidasJuntos || b.ganadas - a.ganadas)
  return res
}
