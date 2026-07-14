// Insignias / logros.
//  - tipo 'evento': se ganan una vez y quedan (viven en db.insigniasOtorgadas).
//  - tipo 'titulo': se recalculan siempre (ej. "Rey del Fernet" cambia si otro
//    lo supera), así que NO se guardan: se computan al vuelo.
import type { DB, ID, InsigniaCatalogo, TragoCodigo } from '../types'
import { resultadoApuesta } from './points'
import { castigadoDelMes, mesAnterior } from './castigo'

export const CATALOGO: InsigniaCatalogo[] = [
  { codigo: 'rey_fernet', nombre: 'Rey del Fernet', descripcion: 'El que más fernet tomó en la historia', icono: '👑', tipo: 'titulo' },
  { codigo: 'rey_cerveza', nombre: 'Barril Andante', descripcion: 'El que más cerveza tomó en la historia', icono: '🍺', tipo: 'titulo' },
  { codigo: 'rey_mvp', nombre: 'El Crack', descripcion: 'El que más veces fue MVP', icono: '🏆', tipo: 'titulo' },
  { codigo: 'rey_rechazos', nombre: 'Corazón de Piedra', descripcion: 'El que más rechazos coleccionó', icono: '💔', tipo: 'titulo' },
  { codigo: 'cornudo_mes', nombre: 'Cornudo del Mes', descripcion: 'Quedó último en el ranking del mes pasado', icono: '🐮', tipo: 'titulo' },
  { codigo: 'el_apostador', nombre: 'El Apostador', descripcion: 'El que más puntos ganó apostando', icono: '🎲', tipo: 'titulo' },
  { codigo: 'nunca_falta', nombre: 'Nunca Falta', descripcion: 'El que más salidas tiene en la historia', icono: '📅', tipo: 'titulo' },
  { codigo: 'rechazo_serial', nombre: 'Insistente', descripcion: '3+ rechazos en una sola noche', icono: '🙈', tipo: 'evento' },
  { codigo: 'esponja', nombre: 'Esponja', descripcion: '20+ tragos en una sola noche', icono: '🧽', tipo: 'evento' },
  { codigo: 'sobreviviente', nombre: 'Sobreviviente', descripcion: 'Salió 3 findes seguidos', icono: '🧟', tipo: 'evento' },
  { codigo: 'batacazo', nombre: 'El Batacazo', descripcion: 'Acertó una apuesta con cuota 2.5x o más', icono: '💥', tipo: 'evento' },
]

export function catalogoDe(codigo: string): InsigniaCatalogo | undefined {
  return CATALOGO.find((c) => c.codigo === codigo)
}

function totalTrago(db: DB, profileId: ID, codigo: TragoCodigo): number {
  return db.registrosTrago
    .filter((r) => r.profileId === profileId && r.tragoCodigo === codigo)
    .reduce((a, r) => a + r.cantidad, 0)
}

/** Devuelve el profileId que ostenta cada título dinámico (o null si nadie). */
export function titularesDinamicos(db: DB): Record<string, ID | null> {
  const pick = (score: (id: ID) => number): ID | null => {
    let best: ID | null = null
    let bestVal = 0
    for (const p of db.profiles) {
      const v = score(p.id)
      if (v > bestVal) {
        bestVal = v
        best = p.id
      }
    }
    return best
  }
  return {
    rey_fernet: pick((id) => totalTrago(db, id, 'fernet')),
    rey_cerveza: pick((id) => totalTrago(db, id, 'cerveza')),
    rey_mvp: pick((id) => db.salidas.filter((s) => s.mvpGanadorId === id).length),
    rey_rechazos: pick((id) => db.rechazos.filter((r) => r.profileId === id).reduce((a, r) => a + r.cantidad, 0)),
    cornudo_mes: castigadoDelMes(db, mesAnterior())?.perdedor.id ?? null,
    el_apostador: pick((id) =>
      db.apuestaParticipaciones
        .filter((p) => p.profileId === id)
        .reduce((a, p) => a + resultadoApuesta(db, p.apuestaId, id), 0)
    ),
    nunca_falta: pick((id) => db.salidas.filter((s) => s.participantes.includes(id)).length),
  }
}

/** Insignias (evento + títulos) que corresponden a un perfil, para su perfil. */
export function insigniasDe(db: DB, profileId: ID): InsigniaCatalogo[] {
  const result: InsigniaCatalogo[] = []
  const titulares = titularesDinamicos(db)
  for (const c of CATALOGO) {
    if (c.tipo === 'titulo') {
      if (titulares[c.codigo] === profileId) result.push(c)
    } else {
      if (db.insigniasOtorgadas.some((o) => o.profileId === profileId && o.insigniaCodigo === c.codigo))
        result.push(c)
    }
  }
  return result
}

/**
 * Evalúa insignias de evento tras cargar/editar stats de una salida y las
 * otorga si corresponden (idempotente). Muta la DB recibida (draft).
 */
export function evaluarInsigniasEvento(db: DB, salidaId: ID) {
  const salida = db.salidas.find((s) => s.id === salidaId)
  if (!salida) return

  for (const profileId of salida.participantes) {
    // 3+ rechazos en la noche
    const rj = db.rechazos.find((r) => r.salidaId === salidaId && r.profileId === profileId)
    if (rj && rj.cantidad >= 3) otorgar(db, profileId, 'rechazo_serial', salidaId)

    // 20+ tragos en la noche
    const tragos = db.registrosTrago
      .filter((r) => r.salidaId === salidaId && r.profileId === profileId)
      .reduce((a, r) => a + r.cantidad, 0)
    if (tragos >= 20) otorgar(db, profileId, 'esponja', salidaId)

    // acertó una apuesta de cuota alta (2.5x+) en esta salida
    for (const ap of db.apuestas) {
      if (ap.salidaId !== salidaId || ap.cuota < 2.5) continue
      if (resultadoApuesta(db, ap.id, profileId) > 0) otorgar(db, profileId, 'batacazo', salidaId)
    }
  }
}

function otorgar(db: DB, profileId: ID, codigo: string, salidaId: ID) {
  const yaLaTiene = db.insigniasOtorgadas.some(
    (o) => o.profileId === profileId && o.insigniaCodigo === codigo && o.salidaId === salidaId
  )
  if (yaLaTiene) return
  db.insigniasOtorgadas.push({
    id: crypto.randomUUID(),
    profileId,
    insigniaCodigo: codigo,
    salidaId,
    otorgadaEn: new Date().toISOString(),
  })
}
