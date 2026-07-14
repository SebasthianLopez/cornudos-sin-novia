import { useEffect, useState } from 'react'
import { useDB, useSession, setSessionId, startSync, useBootStatus, retryBoot } from './lib/store'
import Auth from './pages/Auth'
import Ranking from './pages/Ranking'
import Salidas from './pages/Salidas'
import EnVivo from './pages/EnVivo'
import Perfil from './pages/Perfil'
import NuevaSalida from './pages/NuevaSalida'
import SalidaDetalle from './pages/SalidaDetalle'
import Wrapped from './pages/Wrapped'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import type { Tab } from './components/BottomNav'
import type { ID } from './types'

type Overlay = { name: 'salida'; id: ID } | { name: 'nueva' } | { name: 'wrapped' } | null

export default function App() {
  const db = useDB()
  const session = useSession()
  const boot = useBootStatus()
  const [tab, setTab] = useState<Tab>('ranking')
  const [overlay, setOverlay] = useState<Overlay>(null)

  useEffect(() => {
    startSync()
  }, [])

  const me = session ? db.profiles.find((p) => p.id === session) ?? null : null

  // sesión apunta a un perfil que ya no existe → cerrar
  useEffect(() => {
    if (boot === 'ready' && session && !me) setSessionId(null)
  }, [boot, session, me])

  if (boot === 'loading') {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-center animate-fade-up">
          <div className="mx-auto w-20 h-20 rounded-3xl grid place-items-center text-4xl bg-gradient-to-br from-brand-500 to-neon-fuchsia shadow-glow animate-float">
            🍸
          </div>
          <p className="mt-5 text-2xl font-display font-bold text-gradient">Cornudos sin Novia</p>
          <p className="mt-2 text-sm text-gray-500 animate-pulse">Cargando la joda…</p>
        </div>
      </div>
    )
  }

  if (boot === 'error') {
    return (
      <div className="min-h-dvh grid place-items-center px-8">
        <div className="text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-white font-semibold">Sin conexión con el servidor</p>
          <p className="mt-2 text-sm text-gray-500">Fijate tu señal o tus datos y reintentá.</p>
          <button
            onClick={retryBoot}
            className="mt-5 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia font-semibold text-white shadow-glow active:scale-[0.98] transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!me) return <Auth />

  return (
    <div className="max-w-md mx-auto min-h-dvh flex flex-col relative sm:border-x sm:border-white/5">
      {overlay?.name === 'salida' ? (
        <SalidaDetalle salidaId={overlay.id} meId={me.id} onBack={() => setOverlay(null)} />
      ) : overlay?.name === 'nueva' ? (
        <NuevaSalida
          meId={me.id}
          onCreated={(id) => setOverlay({ name: 'salida', id })}
          onCancel={() => setOverlay(null)}
        />
      ) : overlay?.name === 'wrapped' ? (
        <Wrapped meId={me.id} onBack={() => setOverlay(null)} />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto no-scrollbar">
            <InstallPrompt />
            {tab === 'ranking' && (
              <Ranking meId={me.id} onOpenSalida={(id) => setOverlay({ name: 'salida', id })} />
            )}
            {tab === 'salidas' && (
              <Salidas
                meId={me.id}
                onOpenSalida={(id) => setOverlay({ name: 'salida', id })}
                onNueva={() => setOverlay({ name: 'nueva' })}
              />
            )}
            {tab === 'vivo' && (
              <EnVivo
                meId={me.id}
                onOpenSalida={(id) => setOverlay({ name: 'salida', id })}
                onNueva={() => setOverlay({ name: 'nueva' })}
              />
            )}
            {tab === 'perfil' && <Perfil meId={me.id} onWrapped={() => setOverlay({ name: 'wrapped' })} />}
          </main>
          <BottomNav tab={tab} onChange={setTab} />
        </>
      )}
    </div>
  )
}
