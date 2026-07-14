// Autenticación de la app: cada amigo se registra con nombre + foto + PIN.
// No usamos Supabase Auth: el perfil (incluido el PIN) vive en joda_profiles y
// el login compara el PIN contra la copia local sincronizada. Es seguridad de
// "grupo de amigos", no de banco — a propósito.
import { getDB, getSessionId, mutate, setSessionId, uid } from './store'
import { avatarPath, uploadDataUrl } from './storage'
import type { Profile } from '../types'

const COLORS = ['#a855f7', '#22d3ee', '#f59e0b', '#ec4899', '#34d399', '#60a5fa', '#f43f5e', '#facc15']
const EMOJIS = ['😎', '🍻', '🕶️', '🤠', '🥴', '🦁', '🐉', '👑', '🔥', '🎲']

export function slugify(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function nombreDisponible(nombre: string): boolean {
  const slug = slugify(nombre)
  if (!slug) return false
  return !getDB().profiles.some((p) => slugify(p.displayName) === slug)
}

export interface RegisterInput {
  displayName: string
  pin: string
  avatar?: string // dataURL
  /** código de invitación del grupo (no se pide al primer usuario) */
  codigo?: string
}

export function necesitaCodigo(): boolean {
  return getDB().profiles.length > 0
}

export function codigoValido(codigo: string): boolean {
  return codigo.trim() === getDB().puntosConfig.codigoGrupo
}

export type RegisterResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string }

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const name = input.displayName.trim()
  if (name.length < 2) return { ok: false, error: 'Poné un nombre (mínimo 2 letras).' }
  if (!/^\d{4}$/.test(input.pin)) return { ok: false, error: 'El PIN tiene que ser de 4 números.' }
  if (!nombreDisponible(name)) return { ok: false, error: 'Ese nombre ya está usado. Probá otro.' }
  if (necesitaCodigo() && !codigoValido(input.codigo ?? ''))
    return { ok: false, error: 'Código de invitación incorrecto. Pedile el código al grupo.' }

  const id = uid()

  // La foto va a Storage; si falla la subida se guarda el dataURL directo
  // en la fila (funciona igual, solo pesa más).
  let avatar = input.avatar ?? ''
  if (avatar.startsWith('data:')) {
    avatar = (await uploadDataUrl(avatarPath(id), avatar)) ?? avatar
  }

  const count = getDB().profiles.length
  const profile: Profile = {
    id,
    displayName: name,
    avatar,
    emoji: EMOJIS[count % EMOJIS.length],
    color: COLORS[count % COLORS.length],
    pin: input.pin,
    createdAt: new Date().toISOString(),
  }
  mutate((db) => {
    db.profiles.push(profile)
  })
  setSessionId(profile.id)
  return { ok: true, profile }
}

export type LoginResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string }

export function login(profileId: string, pin: string): LoginResult {
  const profile = getDB().profiles.find((p) => p.id === profileId)
  if (!profile) return { ok: false, error: 'Perfil no encontrado.' }
  if (profile.pin !== pin) return { ok: false, error: 'PIN incorrecto.' }
  setSessionId(profile.id)
  return { ok: true, profile }
}

export function logout() {
  setSessionId(null)
}

export function currentProfile(): Profile | null {
  const id = getSessionId()
  if (!id) return null
  return getDB().profiles.find((p) => p.id === id) ?? null
}
