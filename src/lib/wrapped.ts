// Resumen anual estilo "Wrapped" para un perfil.
import type { DB, ID, TragoCodigo } from '../types'
import { puntosEnSalida, puntosPorTrago } from './points'

export interface WrappedData {
  year: number
  salidas: number
  totalTragos: number
  conteos: Record<TragoCodigo, number>
  tragoFavorito: { codigo: TragoCodigo; cantidad: number } | null
  rechazos: number
  mvps: number
  retosCumplidos: number
  puntosTotales: number
  mejorSalida: { salidaId: ID; lugar: string; fecha: string; puntos: number } | null
}

export function computeWrapped(db: DB, profileId: ID, year: number): WrappedData {
  const salidasAnio = db.salidas.filter(
    (s) => s.participantes.includes(profileId) && new Date(s.fecha).getFullYear() === year
  )
  const salidaIds = new Set(salidasAnio.map((s) => s.id))

  const conteos: Record<TragoCodigo, number> = { cerveza: 0, fernet: 0, whisky: 0, ron: 0 }
  let totalTragos = 0
  let puntosTotales = 0
  for (const rt of db.registrosTrago) {
    if (rt.profileId !== profileId || !salidaIds.has(rt.salidaId)) continue
    conteos[rt.tragoCodigo] += rt.cantidad
    totalTragos += rt.cantidad
    puntosTotales += rt.cantidad * puntosPorTrago(db, rt.tragoCodigo)
  }

  let rechazos = 0
  for (const rj of db.rechazos) {
    if (rj.profileId === profileId && salidaIds.has(rj.salidaId)) rechazos += rj.cantidad
  }
  puntosTotales += rechazos * db.puntosConfig.rechazo

  const mvps = salidasAnio.filter((s) => s.mvpGanadorId === profileId).length
  puntosTotales += mvps * db.puntosConfig.mvpBonus

  const retosCumplidos = db.retoCumplimientos.filter((c) => {
    if (c.profileId !== profileId || c.estado !== 'confirmado') return false
    const prop = db.retoPropuestas.find((p) => p.id === c.retoPropuestaId)
    return prop ? salidaIds.has(prop.salidaId) : false
  }).length
  puntosTotales += retosCumplidos * db.puntosConfig.retoBonus

  let tragoFavorito: WrappedData['tragoFavorito'] = null
  for (const codigo of ['cerveza', 'fernet', 'whisky', 'ron'] as TragoCodigo[]) {
    if (!tragoFavorito || conteos[codigo] > tragoFavorito.cantidad) {
      tragoFavorito = { codigo, cantidad: conteos[codigo] }
    }
  }
  if (tragoFavorito && tragoFavorito.cantidad === 0) tragoFavorito = null

  let mejorSalida: WrappedData['mejorSalida'] = null
  for (const s of salidasAnio) {
    const pts = puntosEnSalida(db, s.id, profileId)
    if (!mejorSalida || pts > mejorSalida.puntos) {
      mejorSalida = { salidaId: s.id, lugar: s.lugar, fecha: s.fecha, puntos: pts }
    }
  }

  return {
    year,
    salidas: salidasAnio.length,
    totalTragos,
    conteos,
    tragoFavorito,
    rechazos,
    mvps,
    retosCumplidos,
    puntosTotales,
    mejorSalida,
  }
}
