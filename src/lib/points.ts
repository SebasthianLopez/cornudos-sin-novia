// Cálculo de puntos y ranking. Todo se computa al vuelo desde la DB (no hay
// columnas de "puntaje total" mutables), igual que la vista ranking_global de
// Supabase descripta en el plan.
import type { DB, RankingRow, TragoCodigo, ID, Profile } from '../types'

const TRAGO_CODIGOS: TragoCodigo[] = ['cerveza', 'fernet', 'whisky', 'ron']

function emptyConteos(): Record<TragoCodigo, number> {
  return { cerveza: 0, fernet: 0, whisky: 0, ron: 0 }
}

export function puntosPorTrago(db: DB, codigo: TragoCodigo): number {
  return db.tragoTipos.find((t) => t.codigo === codigo)?.puntosPorUnidad ?? 1
}

/** Ganancia/pérdida de puntos de una participación en una apuesta ya resuelta. */
export function resultadoApuesta(db: DB, apuestaId: ID, profileId: ID): number {
  const ap = db.apuestas.find((a) => a.id === apuestaId)
  if (!ap || (ap.estado !== 'cumplida' && ap.estado !== 'no_cumplida')) return 0
  const part = db.apuestaParticipaciones.find(
    (p) => p.apuestaId === apuestaId && p.profileId === profileId
  )
  if (!part) return 0
  const acerto =
    (part.lado && ap.estado === 'cumplida') || (!part.lado && ap.estado === 'no_cumplida')
  // Ganancia NETA: lo apostado nunca sale del saldo, así que al acertar se
  // suma apostado×(cuota−1); al errar se resta lo apostado.
  return acerto
    ? Math.round(part.puntosApostados * (ap.cuota - 1))
    : -part.puntosApostados
}

export function computeRanking(db: DB): RankingRow[] {
  const rows: RankingRow[] = db.profiles.map((profile) => {
    const conteos = emptyConteos()
    let puntosTrago = 0
    for (const rt of db.registrosTrago) {
      if (rt.profileId !== profile.id) continue
      conteos[rt.tragoCodigo] += rt.cantidad
      puntosTrago += rt.cantidad * puntosPorTrago(db, rt.tragoCodigo)
    }

    let rechazosTotal = 0
    for (const rj of db.rechazos) {
      if (rj.profileId === profile.id) rechazosTotal += rj.cantidad
    }
    const puntosRechazos = rechazosTotal * db.puntosConfig.rechazo

    const mvps = db.salidas.filter((s) => s.mvpGanadorId === profile.id).length
    const puntosMvp = mvps * db.puntosConfig.mvpBonus

    const retosOk = db.retoCumplimientos.filter(
      (c) => c.profileId === profile.id && c.estado === 'confirmado'
    ).length
    const puntosReto = retosOk * db.puntosConfig.retoBonus

    let puntosApuestas = 0
    for (const part of db.apuestaParticipaciones) {
      if (part.profileId !== profile.id) continue
      puntosApuestas += resultadoApuesta(db, part.apuestaId, profile.id)
    }

    const puntosTotal =
      db.puntosConfig.puntosIniciales +
      puntosTrago + puntosRechazos + puntosMvp + puntosReto + puntosApuestas

    return {
      profile,
      puntosTotal,
      puntosTrago,
      puntosRechazos,
      puntosMvp,
      puntosReto,
      puntosApuestas,
      conteos,
      rechazos: rechazosTotal,
      mvps,
    }
  })

  rows.sort((a, b) => b.puntosTotal - a.puntosTotal || a.profile.displayName.localeCompare(b.profile.displayName))
  return rows
}

export function rankingRowFor(db: DB, profileId: ID): RankingRow | undefined {
  return computeRanking(db).find((r) => r.profile.id === profileId)
}

/** Puntos que sumó un perfil en UNA salida puntual (para la vista de detalle). */
export function puntosEnSalida(db: DB, salidaId: ID, profileId: ID): number {
  let total = 0
  for (const rt of db.registrosTrago) {
    if (rt.salidaId === salidaId && rt.profileId === profileId)
      total += rt.cantidad * puntosPorTrago(db, rt.tragoCodigo)
  }
  for (const rj of db.rechazos) {
    if (rj.salidaId === salidaId && rj.profileId === profileId)
      total += rj.cantidad * db.puntosConfig.rechazo
  }
  const salida = db.salidas.find((s) => s.id === salidaId)
  if (salida?.mvpGanadorId === profileId) total += db.puntosConfig.mvpBonus
  return total
}

export function nombreTrago(codigos: TragoCodigo): string {
  const map: Record<TragoCodigo, string> = {
    cerveza: 'Cervezas',
    fernet: 'Fernet',
    whisky: 'Whisky',
    ron: 'Ron',
  }
  return map[codigos]
}

export function profileById(db: DB, id: ID): Profile | undefined {
  return db.profiles.find((p) => p.id === id)
}

export { TRAGO_CODIGOS }
