// Castigo del mes: el que menos puntos ganó en las salidas de un mes carga
// con el castigo configurado (puntosConfig.castigoTexto). Se computa al vuelo
// desde la DB, como todo el ranking.
import type { DB, ID, Profile } from '../types'
import { puntosCompletosEnSalida } from './points'
import { today } from './store'

export interface CastigoMes {
  ym: string // 'YYYY-MM'
  perdedor: Profile
  puntos: number
  salidas: number
  /** true si hubo empate en el último lugar (se muestra igual el primero alfabético) */
  empate: boolean
}

export function mesDe(fecha: string): string {
  return fecha.slice(0, 7)
}

export function mesActual(): string {
  return mesDe(today())
}

export function mesAnterior(): string {
  const [y, m] = mesActual().split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nombreMes(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
}

/** El castigado de un mes: participó de alguna salida y ganó menos puntos que el resto. */
export function castigadoDelMes(db: DB, ym: string): CastigoMes | null {
  const salidas = db.salidas.filter((s) => mesDe(s.fecha) === ym)
  if (salidas.length === 0) return null

  const puntos = new Map<ID, number>()
  for (const s of salidas) {
    for (const pid of s.participantes) {
      puntos.set(pid, (puntos.get(pid) ?? 0) + puntosCompletosEnSalida(db, s.id, pid))
    }
  }
  if (puntos.size < 2) return null // con uno solo no hay castigo que valga

  const ordenados = [...puntos.entries()].sort(
    (a, b) =>
      a[1] - b[1] ||
      (db.profiles.find((p) => p.id === a[0])?.displayName ?? '').localeCompare(
        db.profiles.find((p) => p.id === b[0])?.displayName ?? ''
      )
  )
  const [perdedorId, min] = ordenados[0]
  const perdedor = db.profiles.find((p) => p.id === perdedorId)
  if (!perdedor) return null
  return {
    ym,
    perdedor,
    puntos: min,
    salidas: salidas.length,
    empate: ordenados.length > 1 && ordenados[1][1] === min,
  }
}

/** Historial de castigados (meses cerrados, del más reciente al más viejo). */
export function historialCastigos(db: DB): CastigoMes[] {
  const actual = mesActual()
  const meses = [...new Set(db.salidas.map((s) => mesDe(s.fecha)))]
    .filter((ym) => ym < actual)
    .sort()
    .reverse()
  return meses
    .map((ym) => castigadoDelMes(db, ym))
    .filter((c): c is CastigoMes => c !== null)
}
