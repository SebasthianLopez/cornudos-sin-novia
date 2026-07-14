// Estadísticas por lugar: agrupa las salidas por el campo "lugar" (ignorando
// mayúsculas) y suma lo que rindió cada uno para el grupo.
import type { DB } from '../types'
import { puntosCompletosEnSalida } from './points'

export interface LugarStats {
  nombre: string
  salidas: number
  puntosGrupo: number
  ultimaFecha: string
}

export function lugaresDelGrupo(db: DB): LugarStats[] {
  const map = new Map<string, LugarStats>()
  for (const s of db.salidas) {
    const nombre = s.lugar.trim()
    if (!nombre) continue
    const key = nombre.toLowerCase()
    let puntos = 0
    for (const pid of s.participantes) puntos += puntosCompletosEnSalida(db, s.id, pid)
    const prev = map.get(key)
    if (prev) {
      prev.salidas++
      prev.puntosGrupo += puntos
      if (s.fecha > prev.ultimaFecha) prev.ultimaFecha = s.fecha
    } else {
      map.set(key, { nombre, salidas: 1, puntosGrupo: puntos, ultimaFecha: s.fecha })
    }
  }
  return [...map.values()].sort((a, b) => b.salidas - a.salidas || b.puntosGrupo - a.puntosGrupo)
}
