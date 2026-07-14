// Service worker de "Cornudos sin Novia" (PWA instalable + shell offline).
// Rutas RELATIVAS al scope para que funcione en subcarpetas (GitHub Pages).
// Navegaciones: network-first (para que lleguen updates); assets: cache-first.
const CACHE = 'cornudos-v4'
const SHELL = [
  './',
  './index.html',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// --------- Notificaciones push (enviadas por la edge function joda-push) ---------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    /* payload raro: se muestra genérico */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cornudos sin Novia', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || './' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abiertas) => {
      for (const c of abiertas) if ('focus' in c) return c.focus()
      return clients.openWindow(event.notification.data?.url || './')
    })
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Nunca cachear llamadas al backend (Supabase REST/Storage/Realtime).
  if (url.hostname.endsWith('.supabase.co')) return

  // version.json es el detector de updates: siempre a la red, jamás al caché.
  if (url.pathname.endsWith('/version.json')) return

  // Navegaciones: network-first, con fallback al shell cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')))
    return
  }

  // Assets estáticos: cache-first, después red (y se cachea).
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        })
    )
  )
})
