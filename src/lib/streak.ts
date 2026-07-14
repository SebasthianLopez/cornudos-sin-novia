// Racha de salidas: cuántos "fines de semana" seguidos participó cada perfil.
// Agrupamos las salidas por semana ISO y contamos semanas consecutivas hacia
// atrás desde la última semana con salida. Función pura y testeable.
import type { DB, ID } from '../types'

/** Devuelve el número de semana (año*100 + semana) para agrupar por finde. */
function weekKey(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  // ISO week number
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7
    )
  return target.getFullYear() * 100 + week
}

export function rachaDe(db: DB, profileId: ID): number {
  const semanas = new Set<number>()
  for (const s of db.salidas) {
    if (s.participantes.includes(profileId)) semanas.add(weekKey(s.fecha))
  }
  if (semanas.size === 0) return 0

  const ordenadas = [...semanas].sort((a, b) => b - a)
  let racha = 1
  for (let i = 1; i < ordenadas.length; i++) {
    // semanas consecutivas: diferencia de 1 (mismo año) — aproximación simple
    if (ordenadas[i - 1] - ordenadas[i] === 1) racha++
    else break
  }
  return racha
}

export function rachaMaxima(db: DB): { profileId: ID; racha: number } | null {
  let best: { profileId: ID; racha: number } | null = null
  for (const p of db.profiles) {
    const r = rachaDe(db, p.id)
    if (!best || r > best.racha) best = { profileId: p.id, racha: r }
  }
  return best
}
