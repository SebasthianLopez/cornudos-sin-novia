// ---------------------------------------------------------------------------
// Store sincronizado de "Cornudos sin Novia".
//
// La fuente de verdad es Supabase (tablas joda_*, ver supabase/schema.sql),
// pero la app trabaja siempre contra una copia local en memoria (optimista):
//
//   - Al arrancar se muestra la última copia cacheada en localStorage y se
//     baja la DB completa con el RPC joda_get_db() (una sola llamada).
//   - mutate(fn) aplica el cambio al draft local al instante (UI inmediata),
//     calcula el diff por tabla y encola las escrituras en un outbox que se
//     persiste en localStorage: si se corta la señal en plena joda, los
//     cambios se re-envían solos al volver la conexión.
//   - Realtime (postgres_changes) + focus + intervalo refrescan la copia
//     local cuando otro amigo carga algo.
//
// El resto de la app (actions.ts, páginas) usa el mismo API de siempre:
// useDB(), mutate(), getDB(), useSession().
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import type { DB, TragoTipo } from '../types'

const CACHE_KEY = 'csn_db_cache_v1'
const OUTBOX_KEY = 'csn_outbox_v1'
const SESSION_KEY = 'csn_session'
export const DB_VERSION = 1

export function uid(): string {
  return crypto.randomUUID()
}

export function today(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const TRAGO_TIPOS: TragoTipo[] = [
  { id: 'cerveza', codigo: 'cerveza', nombre: 'Cerveza', icono: '🍺', puntosPorUnidad: 1, orden: 1 },
  { id: 'fernet', codigo: 'fernet', nombre: 'Fernet', icono: '🥃', puntosPorUnidad: 2, orden: 2 },
  { id: 'whisky', codigo: 'whisky', nombre: 'Whisky', icono: '🥃', puntosPorUnidad: 3, orden: 3 },
  { id: 'ron', codigo: 'ron', nombre: 'Ron', icono: '🍹', puntosPorUnidad: 3, orden: 4 },
]

const DEFAULT_PUNTOS_CONFIG = {
  rechazo: 1,
  mvpBonus: 50,
  retoBonus: 120,
  puntosIniciales: 1000,
  codigoGrupo: '4444',
  castigoTexto: 'Paga el primer round de la próxima salida',
}

function emptyDB(): DB {
  return {
    version: DB_VERSION,
    profiles: [],
    tragoTipos: TRAGO_TIPOS,
    puntosConfig: { ...DEFAULT_PUNTOS_CONFIG },
    salidas: [],
    registrosTrago: [],
    rechazos: [],
    mvpVotos: [],
    retoPropuestas: [],
    retoVotos: [],
    retoCumplimientos: [],
    retoConfirmacionVotos: [],
    apuestas: [],
    apuestaParticipaciones: [],
    apuestaVotosResolucion: [],
    mediaItems: [],
    mediaReacciones: [],
    mediaComentarios: [],
    insigniasOtorgadas: [],
  }
}

// --------------------------- mapeo DB ↔ tablas ---------------------------

type Row = { id: string } & Record<string, unknown>

type ArrayKey = Exclude<keyof DB, 'version' | 'puntosConfig'>

interface TableDef {
  key: ArrayKey
  table: string
  /** columnas de la clave natural (para upsert onConflict y deletes) */
  natural?: string[]
}

const TABLES: TableDef[] = [
  { key: 'profiles', table: 'joda_profiles' },
  { key: 'tragoTipos', table: 'joda_trago_tipos' },
  { key: 'salidas', table: 'joda_salidas' },
  { key: 'registrosTrago', table: 'joda_registros_trago', natural: ['salidaId', 'profileId', 'tragoCodigo'] },
  { key: 'rechazos', table: 'joda_rechazos', natural: ['salidaId', 'profileId'] },
  { key: 'mvpVotos', table: 'joda_mvp_votos', natural: ['salidaId', 'votanteId'] },
  { key: 'retoPropuestas', table: 'joda_reto_propuestas' },
  { key: 'retoVotos', table: 'joda_reto_votos', natural: ['salidaId', 'votanteId'] },
  { key: 'retoCumplimientos', table: 'joda_reto_cumplimientos', natural: ['retoPropuestaId', 'profileId'] },
  { key: 'retoConfirmacionVotos', table: 'joda_reto_confirmacion_votos', natural: ['cumplimientoId', 'votanteId'] },
  { key: 'apuestas', table: 'joda_apuestas' },
  { key: 'apuestaParticipaciones', table: 'joda_apuesta_participaciones', natural: ['apuestaId', 'profileId'] },
  { key: 'apuestaVotosResolucion', table: 'joda_apuesta_votos_resolucion', natural: ['apuestaId', 'votanteId'] },
  { key: 'mediaItems', table: 'joda_media_items' },
  { key: 'mediaReacciones', table: 'joda_media_reacciones', natural: ['mediaId', 'profileId'] },
  { key: 'mediaComentarios', table: 'joda_media_comentarios' },
  { key: 'insigniasOtorgadas', table: 'joda_insignias_otorgadas' },
]

// --------------------------- estado en memoria ---------------------------

const EMPTY = emptyDB()
let current: DB | null = loadCache()
let bootError = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

function loadCache(): DB | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DB
    if (!parsed || parsed.version !== DB_VERSION) return null
    parsed.puntosConfig = { ...DEFAULT_PUNTOS_CONFIG, ...parsed.puntosConfig }
    return parsed
  } catch {
    return null
  }
}

function persistCache() {
  try {
    if (current) localStorage.setItem(CACHE_KEY, JSON.stringify(current))
  } catch {
    /* cuota llena: seguimos en memoria */
  }
}

export function getDB(): DB {
  return current ?? EMPTY
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Hook reactivo: re-renderiza cuando cambia la DB. */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB)
}

export type BootStatus = 'loading' | 'ready' | 'error'

function getBootStatus(): BootStatus {
  if (current !== null) return 'ready'
  return bootError ? 'error' : 'loading'
}

/** Estado del primer arranque (splash / error de conexión / listo). */
export function useBootStatus(): BootStatus {
  return useSyncExternalStore(subscribe, getBootStatus)
}

// --------------------------- outbox de escrituras ---------------------------

interface Op {
  table: string
  type: 'upsert' | 'delete'
  rows: Row[]
  /** columnas de conflicto/borrado por clave natural */
  natural?: string[]
}

let outbox: Op[] = loadOutbox()

function loadOutbox(): Op[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    return raw ? (JSON.parse(raw) as Op[]) : []
  } catch {
    return []
  }
}

function persistOutbox() {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox))
  } catch {
    /* ignore */
  }
}

function isRetryable(message: string): boolean {
  return /fetch|network|load failed|timeout|abort/i.test(message)
}

let flushing = false

async function flush() {
  if (flushing) return
  flushing = true
  try {
    let wrote = false
    while (outbox.length > 0) {
      const op = outbox[0]
      const status = await runOp(op)
      if (status === 'retry') return // sin red: reintenta online/focus/interval
      if (status === 'ok') wrote = true
      // 'ok' y 'drop' sacan la op de la cola
      outbox.shift()
      persistOutbox()
    }
    if (wrote) scheduleRefetch(150)
  } finally {
    flushing = false
  }
}

async function runOp(op: Op): Promise<'ok' | 'retry' | 'drop'> {
  try {
    if (op.type === 'upsert') {
      const opts = op.natural ? { onConflict: op.natural.join(',') } : undefined
      const { error } = await supabase.from(op.table).upsert(op.rows, opts)
      if (error) {
        if (isRetryable(error.message)) return 'retry'
        console.warn('[sync] descartando upsert', op.table, error.message)
        return 'drop'
      }
      return 'ok'
    }
    for (const row of op.rows) {
      let q = supabase.from(op.table).delete()
      if (op.natural) for (const col of op.natural) q = q.eq(col, row[col] as string)
      else q = q.eq('id', row.id)
      const { error } = await q
      if (error) {
        if (isRetryable(error.message)) return 'retry'
        console.warn('[sync] descartando delete', op.table, error.message)
        return 'drop'
      }
    }
    return 'ok'
  } catch {
    return 'retry'
  }
}

// --------------------------- diff y mutate ---------------------------

function diffAndEnqueue(before: DB, after: DB) {
  const ops: Op[] = []
  for (const def of TABLES) {
    const prev = before[def.key] as unknown as Row[]
    const next = after[def.key] as unknown as Row[]
    const prevById = new Map(prev.map((r) => [r.id, r]))
    const nextIds = new Set(next.map((r) => r.id))

    const upserts = next.filter((r) => {
      const old = prevById.get(r.id)
      return !old || JSON.stringify(old) !== JSON.stringify(r)
    })
    const deletes = prev.filter((r) => !nextIds.has(r.id))

    if (upserts.length) ops.push({ table: def.table, type: 'upsert', rows: upserts, natural: def.natural })
    if (deletes.length) ops.push({ table: def.table, type: 'delete', rows: deletes, natural: def.natural })
  }
  if (JSON.stringify(before.puntosConfig) !== JSON.stringify(after.puntosConfig)) {
    ops.push({
      table: 'joda_config',
      type: 'upsert',
      rows: [{ id: 1, puntosConfig: after.puntosConfig } as unknown as Row],
    })
  }
  if (ops.length) {
    outbox.push(...ops)
    persistOutbox()
    void flush()
  }
}

/** Muta la DB con una función que recibe un borrador clonado (optimista). */
export function mutate(fn: (draft: DB) => void) {
  const before = current ?? emptyDB()
  const draft = structuredClone(before)
  fn(draft)
  current = draft
  persistCache()
  notify()
  diffAndEnqueue(before, draft)
}

// --------------------------- fetch / realtime ---------------------------

let refetchTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRefetch(delayMs: number) {
  if (refetchTimer) clearTimeout(refetchTimer)
  refetchTimer = setTimeout(() => {
    refetchTimer = null
    void fetchAll()
  }, delayMs)
}

export async function fetchAll(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('joda_get_db')
    if (error || !data) {
      if (current === null) {
        bootError = true
        notify()
      }
      return false
    }
    // No pisar cambios locales pendientes: al drenar el outbox se refetchea.
    if (outbox.length > 0 || flushing) return true
    const db = data as DB
    db.version = DB_VERSION
    if (!db.tragoTipos?.length) db.tragoTipos = TRAGO_TIPOS
    // config vieja sin los campos nuevos → completar con defaults
    db.puntosConfig = { ...DEFAULT_PUNTOS_CONFIG, ...db.puntosConfig }
    current = db
    bootError = false
    persistCache()
    notify()
    return true
  } catch {
    if (current === null) {
      bootError = true
      notify()
    }
    return false
  }
}

export function retryBoot() {
  bootError = false
  notify()
  void fetchAll()
}

let syncStarted = false

/** Arranca el ciclo de sincronización (llamar una sola vez, desde App). */
export function startSync() {
  if (syncStarted) return
  syncStarted = true

  void fetchAll()
  if (outbox.length) void flush()

  const channel = supabase.channel('joda-sync')
  for (const def of TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: def.table }, () =>
      scheduleRefetch(400)
    )
  }
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'joda_config' }, () =>
    scheduleRefetch(400)
  )
  channel.subscribe()

  window.addEventListener('online', () => {
    void flush()
    scheduleRefetch(300)
  })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      void flush()
      scheduleRefetch(200)
    }
  })
  setInterval(() => {
    if (!document.hidden) {
      void flush()
      scheduleRefetch(0)
    }
  }, 60000)
}

// --------------------------- sesión ---------------------------

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  notify()
}

export function useSession(): string | null {
  return useSyncExternalStore(subscribe, getSessionId)
}
