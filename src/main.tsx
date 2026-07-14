import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Register the service worker only in production builds. During `vite dev`
// a caching SW fights HMR and serves stale files, so we skip it there.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* PWA is a progressive enhancement; ignore registration failures. */
    })
  })
}

// --- Auto-update: la app instalada se refresca sola al volver a abrirse ---
// Compara el build propio contra el version.json publicado (el SW nunca lo
// cachea). Corre al cargar y cada vez que la app vuelve al frente; si hay
// versión nueva actualiza el SW y recarga. Recargar es seguro: el outbox de
// cambios pendientes persiste en localStorage (store.ts), no se pierde nada.
if (import.meta.env.PROD) {
  const YA_RECARGADO = 'csn_reloaded_for'
  const checkUpdate = async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const { buildId } = (await res.json()) as { buildId?: string }
      if (!buildId || buildId === __BUILD_ID__) return
      // Guarda contra loops: si ya recargamos por este build y seguimos viejos
      // (CDN a medio propagar), no recargar de nuevo hasta el próximo build.
      if (sessionStorage.getItem(YA_RECARGADO) === buildId) return
      sessionStorage.setItem(YA_RECARGADO, buildId)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update().catch(() => {})
      }
      location.reload()
    } catch {
      /* sin señal: se reintenta cuando la app vuelva al frente */
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkUpdate()
  })
  void checkUpdate()
}
