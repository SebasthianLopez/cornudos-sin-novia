// Edge function "joda-push": envía una notificación web push a todos los celus
// suscriptos (tabla joda_push_subs), menos al que originó la acción, y limpia
// las suscripciones vencidas. La llama el frontend (lib/push.ts) al crear una
// salida, una apuesta o un reto.
//
// Claves VAPID: al deployar se inyectan (JSON de supabase/vapid-keys.json, que
// NO está en el repo). Esta copia del repo las lee de la env VAPID_KEYS como
// alternativa (Dashboard → Edge Functions → Secrets).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

const VAPID_KEYS = JSON.parse(Deno.env.get('VAPID_KEYS') ?? '{}')

const appServer = await webpush.ApplicationServer.new({
  contactInformation: 'mailto:sebalopez242000@gmail.com',
  vapidKeys: await webpush.importVapidKeys(VAPID_KEYS, { extractable: false }),
})

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('método no soportado', { status: 405 })

  const { title, body, url, exceptoProfileId } = await req.json().catch(() => ({}))
  if (typeof title !== 'string' || !title.trim() || title.length > 80)
    return new Response('title inválido', { status: 400 })
  const cuerpo = typeof body === 'string' ? body.slice(0, 200) : ''

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let query = supabase.from('joda_push_subs').select('endpoint, sub')
  if (typeof exceptoProfileId === 'string' && exceptoProfileId)
    query = query.neq('profileId', exceptoProfileId)
  const { data: subs, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const payload = JSON.stringify({
    title: title.trim(),
    body: cuerpo,
    url: typeof url === 'string' ? url : './',
  })
  const muertas: string[] = []
  let enviadas = 0

  await Promise.allSettled(
    (subs ?? []).map(async (row) => {
      try {
        const subscriber = appServer.subscribe(row.sub)
        await subscriber.pushTextMessage(payload, {})
        enviadas++
      } catch (err) {
        // suscripción vencida o app desinstalada → se limpia de la tabla
        const status = err instanceof webpush.PushMessageError ? err.response?.status : 0
        if (status === 404 || status === 410) muertas.push(row.endpoint)
      }
    })
  )

  if (muertas.length) await supabase.from('joda_push_subs').delete().in('endpoint', muertas)

  return Response.json({ enviadas, limpiadas: muertas.length })
})
