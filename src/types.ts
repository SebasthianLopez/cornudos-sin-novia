// ---------------------------------------------------------------------------
// Modelo de dominio de "Cornudos sin Novia".
//
// Estos tipos son la fuente de verdad del front-end y mapean 1:1 a las tablas
// joda_* de Supabase (columnas camelCase con quotes; ver supabase/schema.sql).
// El store (src/lib/store.ts) sincroniza una copia local contra esas tablas.
// ---------------------------------------------------------------------------

export type ID = string

export type TragoCodigo = 'cerveza' | 'fernet' | 'whisky' | 'ron'

export interface Profile {
  id: ID
  displayName: string
  /** dataURL de una foto subida, o vacío si usa emoji/inicial */
  avatar: string
  /** emoji de respaldo cuando no hay foto */
  emoji: string
  /** color de acento del perfil (hex) */
  color: string
  /** PIN de 4 dígitos (login a nivel de app; seguridad "entre amigos") */
  pin: string
  createdAt: string
}

export interface TragoTipo {
  id: ID
  codigo: TragoCodigo
  nombre: string
  icono: string
  puntosPorUnidad: number
  orden: number
}

export interface PuntosConfig {
  rechazo: number
  mvpBonus: number
  retoBonus: number
  /** puntos con los que arranca cada jugador en el ranking */
  puntosIniciales: number
  /** código de invitación que se pide al registrarse */
  codigoGrupo: string
  /** qué le toca al último del ranking de cada mes */
  castigoTexto: string
}

export interface Salida {
  id: ID
  fecha: string // YYYY-MM-DD
  lugar: string
  notas: string
  creadoPor: ID
  participantes: ID[]
  retoActivoId: ID | null
  mvpGanadorId: ID | null
  createdAt: string
}

export interface RegistroTrago {
  id: ID
  salidaId: ID
  profileId: ID
  tragoCodigo: TragoCodigo
  cantidad: number
}

export interface Rechazo {
  id: ID
  salidaId: ID
  profileId: ID
  cantidad: number
}

export interface MvpVoto {
  id: ID
  salidaId: ID
  votanteId: ID
  candidatoId: ID
}

export interface RetoPropuesta {
  id: ID
  salidaId: ID
  propuestoPor: ID
  texto: string
  createdAt: string
}

export interface RetoVoto {
  id: ID
  salidaId: ID
  propuestaId: ID
  votanteId: ID
}

export type CumplimientoEstado = 'pendiente' | 'confirmado' | 'rechazado'

export interface RetoCumplimiento {
  id: ID
  retoPropuestaId: ID
  profileId: ID
  estado: CumplimientoEstado
  createdAt: string
}

export interface RetoConfirmacionVoto {
  id: ID
  cumplimientoId: ID
  votanteId: ID
  voto: boolean // true = sí lo cumplió
}

export type ApuestaEstado =
  | 'abierta'
  | 'en_votacion'
  | 'cumplida'
  | 'no_cumplida'
  | 'cancelada'

export interface Apuesta {
  id: ID
  salidaId: ID
  propuestaPor: ID
  texto: string
  cuota: number
  estado: ApuestaEstado
  createdAt: string
}

export interface ApuestaParticipacion {
  id: ID
  apuestaId: ID
  profileId: ID
  lado: boolean // true = a favor de que se cumpla
  puntosApostados: number
}

export interface ApuestaVotoResolucion {
  id: ID
  apuestaId: ID
  votanteId: ID
  voto: boolean // true = sí se cumplió
}

export type MediaTipo = 'foto' | 'video'

export interface MediaItem {
  id: ID
  salidaId: ID
  subidoPor: ID
  /** URL pública de Storage (o dataURL de fallback si falló la subida) */
  dataUrl: string
  tipo: MediaTipo
  createdAt: string
}

export interface MediaReaccion {
  id: ID
  mediaId: ID
  profileId: ID
  emoji: string
}

export interface MediaComentario {
  id: ID
  mediaId: ID
  profileId: ID
  texto: string
  createdAt: string
}

export type InsigniaTipo = 'evento' | 'titulo'

export interface InsigniaCatalogo {
  codigo: string
  nombre: string
  descripcion: string
  icono: string
  tipo: InsigniaTipo
}

export interface InsigniaOtorgada {
  id: ID
  profileId: ID
  insigniaCodigo: string
  salidaId: ID | null
  otorgadaEn: string
}

// La base de datos completa que persistimos.
export interface DB {
  version: number
  profiles: Profile[]
  tragoTipos: TragoTipo[]
  puntosConfig: PuntosConfig
  salidas: Salida[]
  registrosTrago: RegistroTrago[]
  rechazos: Rechazo[]
  mvpVotos: MvpVoto[]
  retoPropuestas: RetoPropuesta[]
  retoVotos: RetoVoto[]
  retoCumplimientos: RetoCumplimiento[]
  retoConfirmacionVotos: RetoConfirmacionVoto[]
  apuestas: Apuesta[]
  apuestaParticipaciones: ApuestaParticipacion[]
  apuestaVotosResolucion: ApuestaVotoResolucion[]
  mediaItems: MediaItem[]
  mediaReacciones: MediaReaccion[]
  mediaComentarios: MediaComentario[]
  insigniasOtorgadas: InsigniaOtorgada[]
}

// ------- Tipos derivados / de vista (no se persisten) -------

export interface RankingRow {
  profile: Profile
  puntosTotal: number
  puntosTrago: number
  puntosRechazos: number
  puntosMvp: number
  puntosReto: number
  puntosApuestas: number
  // desglose de conteos crudos para mostrar en el leaderboard
  conteos: Record<TragoCodigo, number>
  rechazos: number
  mvps: number
}
