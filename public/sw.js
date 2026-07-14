// Service worker de "Cornudos sin Novia" (PWA instalable + shell offline).
// Rutas RELATIVAS al scope para que funcione en subcarpetas (GitHub Pages).
// Navegaciones: network-first (para que lleguen updates); assets: cache-first.
const CACHE = 'cornudos-v2'
const SHELL = ['./', './index.html', './icon.svg', './icon-192.png', './icon-512.png', './manifest.webmanifest']

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

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Nunca cachear llamadas al backend (Supabase REST/Storage/Realtime).
  if (new URL(req.url).hostname.endsWith('.supabase.co')) return

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
