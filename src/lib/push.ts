// Notificaciones push. Cada celu guarda su suscripción en joda_push_subs;
// el envío lo hace la edge function joda-push (Supabase) con las claves VAPID
// (la privada vive solo en la función; este repo es público).
// En iPhone solo funciona con la app instalada (iOS 16.4+).
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'
import type { ID } from '../types'

// Clave pública VAPID (par generado 2026-07-14, supabase/vapid-keys.json local).
const APPLICATION_SERVER_KEY =
  'BHWIaoUIQoVz5HWX0jELLuMtwU4KT7S4aAioO5AbsWh7gh0UUaY3R3QGwONrMR-IgCze5LiaGZcRoWSvo3IvDPM'

export function pushSoportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) ?? null
  } catch {
    return null
  }
}

function b64UrlAUint8(base64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i)
  return arr
}

export async function activarPush(profileId: ID): Promise<'ok' | 'denegado' | 'error'> {
  try {
    if (!pushSoportado()) return 'error'
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return 'denegado'
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return 'error'
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64UrlAUint8(APPLICATION_SERVER_KEY),
      }))
    const { error } = await supabase.from('joda_push_subs').upsert(
      {
        endpoint: sub.endpoint,
        profileId,
        sub: sub.toJSON(),
        createdAt: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )
    return error ? 'error' : 'ok'
  } catch {
    return 'error'
  }
}

export async function desactivarPush(): Promise<void> {
  try {
    const sub = await suscripcionActual()
    if (!sub) return
    await supabase.from('joda_push_subs').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  } catch {
    /* ignore */
  }
}

/** Avisa a todos los demás celus (fire-and-forget: sin señal no pasa nada). */
export function notificarAmigos(exceptoProfileId: ID, title: string, body: string) {
  void fetch(`${SUPABASE_URL}/functions/v1/joda-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ title, body, exceptoProfileId }),
  }).catch(() => {
    /* la notificación es un extra, nunca un error visible */
  })
}
