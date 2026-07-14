// Todas las mutaciones de dominio. Cada función corre sobre el store local vía
// mutate(). Las resoluciones "grupales" (MVP, reto, apuesta) replican lo que en
// Supabase serían funciones SECURITY DEFINER que corren la votación mayoritaria.
import { mutate, uid } from './store'
import { evaluarInsigniasEvento } from './badges'
import type { DB, ID, TragoCodigo, MediaTipo } from '../types'

// --------------------------- salidas ---------------------------

export function crearSalida(input: {
  fecha: string
  lugar: string
  notas: string
  creadoPor: ID
  participantes: ID[]
}): ID {
  const id = uid()
  mutate((db) => {
    db.salidas.push({
      id,
      fecha: input.fecha,
      lugar: input.lugar.trim(),
      notas: input.notas.trim(),
      creadoPor: input.creadoPor,
      participantes: input.participantes.length ? input.participantes : [input.creadoPor],
      retoActivoId: null,
      mvpGanadorId: null,
      createdAt: new Date().toISOString(),
    })
  })
  return id
}

export function actualizarSalida(id: ID, patch: Partial<Pick<DB['salidas'][number], 'lugar' | 'notas' | 'fecha'>>) {
  mutate((db) => {
    const s = db.salidas.find((x) => x.id === id)
    if (s) Object.assign(s, patch)
  })
}

export function toggleParticipante(salidaId: ID, profileId: ID) {
  mutate((db) => {
    const s = db.salidas.find((x) => x.id === salidaId)
    if (!s) return
    if (s.participantes.includes(profileId))
      s.participantes = s.participantes.filter((p) => p !== profileId)
    else s.participantes.push(profileId)
  })
}

export function eliminarSalida(salidaId: ID) {
  mutate((db) => {
    db.salidas = db.salidas.filter((s) => s.id !== salidaId)
    db.registrosTrago = db.registrosTrago.filter((r) => r.salidaId !== salidaId)
    db.rechazos = db.rechazos.filter((r) => r.salidaId !== salidaId)
    db.mvpVotos = db.mvpVotos.filter((r) => r.salidaId !== salidaId)
    db.mediaItems = db.mediaItems.filter((r) => r.salidaId !== salidaId)
  })
}

// --------------------------- stats ---------------------------

export function setTrago(salidaId: ID, profileId: ID, codigo: TragoCodigo, cantidad: number) {
  mutate((db) => {
    const existing = db.registrosTrago.find(
      (r) => r.salidaId === salidaId && r.profileId === profileId && r.tragoCodigo === codigo
    )
    const c = Math.max(0, Math.round(cantidad))
    if (existing) existing.cantidad = c
    else db.registrosTrago.push({ id: uid(), salidaId, profileId, tragoCodigo: codigo, cantidad: c })
    evaluarInsigniasEvento(db, salidaId)
  })
}

export function setRechazo(salidaId: ID, profileId: ID, cantidad: number) {
  mutate((db) => {
    const existing = db.rechazos.find((r) => r.salidaId === salidaId && r.profileId === profileId)
    const c = Math.max(0, Math.round(cantidad))
    if (existing) existing.cantidad = c
    else db.rechazos.push({ id: uid(), salidaId, profileId, cantidad: c })
    evaluarInsigniasEvento(db, salidaId)
  })
}

// --------------------------- MVP ---------------------------

export function votarMvp(salidaId: ID, votanteId: ID, candidatoId: ID) {
  mutate((db) => {
    const existing = db.mvpVotos.find((v) => v.salidaId === salidaId && v.votanteId === votanteId)
    if (existing) existing.candidatoId = candidatoId
    else db.mvpVotos.push({ id: uid(), salidaId, votanteId, candidatoId })
    resolveMvp(db, salidaId)
  })
}

function resolveMvp(db: DB, salidaId: ID) {
  const votos = db.mvpVotos.filter((v) => v.salidaId === salidaId)
  if (votos.length === 0) return
  const conteo = new Map<ID, number>()
  for (const v of votos) conteo.set(v.candidatoId, (conteo.get(v.candidatoId) ?? 0) + 1)
  let leader: ID | null = null
  let max = 0
  for (const [id, n] of conteo) {
    if (n > max) {
      max = n
      leader = id
    }
  }
  const s = db.salidas.find((x) => x.id === salidaId)
  if (s) s.mvpGanadorId = leader
}

// --------------------------- retos ---------------------------

export function proponerReto(salidaId: ID, propuestoPor: ID, texto: string): ID {
  const id = uid()
  mutate((db) => {
    db.retoPropuestas.push({ id, salidaId, propuestoPor, texto: texto.trim(), createdAt: new Date().toISOString() })
  })
  return id
}

export function votarReto(salidaId: ID, propuestaId: ID, votanteId: ID) {
  mutate((db) => {
    const existing = db.retoVotos.find((v) => v.salidaId === salidaId && v.votanteId === votanteId)
    if (existing) existing.propuestaId = propuestaId
    else db.retoVotos.push({ id: uid(), salidaId, propuestaId, votanteId })
  })
}

export function cerrarVotacionReto(salidaId: ID) {
  mutate((db) => {
    const votos = db.retoVotos.filter((v) => v.salidaId === salidaId)
    const conteo = new Map<ID, number>()
    for (const v of votos) conteo.set(v.propuestaId, (conteo.get(v.propuestaId) ?? 0) + 1)
    let ganadora: ID | null = null
    let max = 0
    for (const [id, n] of conteo) {
      if (n > max) {
        max = n
        ganadora = id
      }
    }
    // si no hubo votos, usar la primera propuesta como reto activo
    if (!ganadora) ganadora = db.retoPropuestas.find((p) => p.salidaId === salidaId)?.id ?? null
    const s = db.salidas.find((x) => x.id === salidaId)
    if (s) s.retoActivoId = ganadora
  })
}

export function marcarCumplido(retoPropuestaId: ID, profileId: ID): ID {
  const id = uid()
  mutate((db) => {
    const ya = db.retoCumplimientos.find(
      (c) => c.retoPropuestaId === retoPropuestaId && c.profileId === profileId
    )
    if (!ya)
      db.retoCumplimientos.push({
        id,
        retoPropuestaId,
        profileId,
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
      })
  })
  return id
}

export function votarConfirmacionReto(cumplimientoId: ID, votanteId: ID, voto: boolean) {
  mutate((db) => {
    const existing = db.retoConfirmacionVotos.find(
      (v) => v.cumplimientoId === cumplimientoId && v.votanteId === votanteId
    )
    if (existing) existing.voto = voto
    else db.retoConfirmacionVotos.push({ id: uid(), cumplimientoId, votanteId, voto })
    resolveConfirmacionReto(db, cumplimientoId)
  })
}

function resolveConfirmacionReto(db: DB, cumplimientoId: ID) {
  const votos = db.retoConfirmacionVotos.filter((v) => v.cumplimientoId === cumplimientoId)
  const si = votos.filter((v) => v.voto).length
  const no = votos.filter((v) => !v.voto).length
  const c = db.retoCumplimientos.find((x) => x.id === cumplimientoId)
  if (!c) return
  if (si > no) c.estado = 'confirmado'
  else if (no > si) c.estado = 'rechazado'
  else c.estado = 'pendiente'
}

// --------------------------- apuestas ---------------------------

export function crearApuesta(salidaId: ID, propuestaPor: ID, texto: string, cuota: number): ID {
  const id = uid()
  mutate((db) => {
    db.apuestas.push({
      id,
      salidaId,
      propuestaPor,
      texto: texto.trim(),
      cuota: Math.max(1.01, cuota),
      estado: 'abierta',
      createdAt: new Date().toISOString(),
    })
  })
  return id
}

export function apostar(apuestaId: ID, profileId: ID, lado: boolean, puntosApostados: number) {
  mutate((db) => {
    const ap = db.apuestas.find((a) => a.id === apuestaId)
    if (!ap || ap.estado !== 'abierta') return
    const existing = db.apuestaParticipaciones.find(
      (p) => p.apuestaId === apuestaId && p.profileId === profileId
    )
    const pts = Math.max(1, Math.round(puntosApostados))
    if (existing) {
      existing.lado = lado
      existing.puntosApostados = pts
    } else {
      db.apuestaParticipaciones.push({ id: uid(), apuestaId, profileId, lado, puntosApostados: pts })
    }
  })
}

export function ponerApuestaEnVotacion(apuestaId: ID) {
  mutate((db) => {
    const ap = db.apuestas.find((a) => a.id === apuestaId)
    if (ap && (ap.estado === 'abierta' || ap.estado === 'en_votacion')) ap.estado = 'en_votacion'
  })
}

export function cancelarApuesta(apuestaId: ID) {
  mutate((db) => {
    const ap = db.apuestas.find((a) => a.id === apuestaId)
    if (ap && ap.estado !== 'cumplida' && ap.estado !== 'no_cumplida') ap.estado = 'cancelada'
  })
}

export function votarResolucionApuesta(apuestaId: ID, votanteId: ID, voto: boolean) {
  mutate((db) => {
    const ap = db.apuestas.find((a) => a.id === apuestaId)
    if (!ap) return
    if (ap.estado === 'abierta') ap.estado = 'en_votacion'
    const existing = db.apuestaVotosResolucion.find(
      (v) => v.apuestaId === apuestaId && v.votanteId === votanteId
    )
    if (existing) existing.voto = voto
    else db.apuestaVotosResolucion.push({ id: uid(), apuestaId, votanteId, voto })
    resolveApuesta(db, apuestaId)
  })
}

function resolveApuesta(db: DB, apuestaId: ID) {
  const ap = db.apuestas.find((a) => a.id === apuestaId)
  if (!ap) return
  const votos = db.apuestaVotosResolucion.filter((v) => v.apuestaId === apuestaId)
  const si = votos.filter((v) => v.voto).length
  const no = votos.filter((v) => !v.voto).length
  if (si > no) ap.estado = 'cumplida'
  else if (no > si) ap.estado = 'no_cumplida'
  else ap.estado = 'en_votacion'
}

// --------------------------- media ---------------------------

export function subirMedia(salidaId: ID, subidoPor: ID, dataUrl: string, tipo: MediaTipo): ID {
  const id = uid()
  mutate((db) => {
    db.mediaItems.push({ id, salidaId, subidoPor, dataUrl, tipo, createdAt: new Date().toISOString() })
  })
  return id
}

export function eliminarMedia(mediaId: ID) {
  mutate((db) => {
    db.mediaItems = db.mediaItems.filter((m) => m.id !== mediaId)
    db.mediaReacciones = db.mediaReacciones.filter((r) => r.mediaId !== mediaId)
    db.mediaComentarios = db.mediaComentarios.filter((c) => c.mediaId !== mediaId)
  })
}

export function reaccionar(mediaId: ID, profileId: ID, emoji: string) {
  mutate((db) => {
    const existing = db.mediaReacciones.find((r) => r.mediaId === mediaId && r.profileId === profileId)
    if (existing) {
      if (existing.emoji === emoji) {
        // misma reacción → sacar (toggle)
        db.mediaReacciones = db.mediaReacciones.filter((r) => r.id !== existing.id)
      } else {
        existing.emoji = emoji
      }
    } else {
      db.mediaReacciones.push({ id: uid(), mediaId, profileId, emoji })
    }
  })
}

export function comentar(mediaId: ID, profileId: ID, texto: string) {
  const t = texto.trim()
  if (!t) return
  mutate((db) => {
    db.mediaComentarios.push({ id: uid(), mediaId, profileId, texto: t, createdAt: new Date().toISOString() })
  })
}

// --------------------------- config ---------------------------

export function setPuntosTrago(codigo: TragoCodigo, puntos: number) {
  mutate((db) => {
    const t = db.tragoTipos.find((x) => x.codigo === codigo)
    if (t) t.puntosPorUnidad = Math.max(0, Math.round(puntos))
  })
}

export function setPuntosConfig(patch: Partial<DB['puntosConfig']>) {
  mutate((db) => {
    Object.assign(db.puntosConfig, patch)
  })
}

// --------------------------- perfil ---------------------------

export function updateProfile(
  id: ID,
  patch: Partial<Pick<DB['profiles'][number], 'displayName' | 'avatar' | 'emoji' | 'color' | 'pin'>>
) {
  mutate((db) => {
    const p = db.profiles.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
  })
}
