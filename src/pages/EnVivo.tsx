import { useDB } from '../lib/store'
import { formatFecha } from '../lib/format'
import { profileById } from '../lib/points'
import MvpSection from '../components/MvpSection'
import RetoSection from '../components/RetoSection'
import ApuestaSection from '../components/ApuestaSection'
import Avatar from '../components/Avatar'
import type { ID } from '../types'

interface Props {
  meId: ID
  onOpenSalida: (id: ID) => void
  onNueva: () => void
}

export default function EnVivo({ meId, onOpenSalida, onNueva }: Props) {
  const db = useDB()
  const ultima = [...db.salidas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]

  if (!ultima) {
    return (
      <div className="pb-6">
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-display font-bold text-white">En vivo ⚡</h1>
        </header>
        <div className="mt-16 text-center px-8">
          <div className="text-5xl mb-3 animate-float">⚡</div>
          <p className="text-gray-400">No hay ninguna salida activa.</p>
          <button
            onClick={onNueva}
            className="mt-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia text-white font-semibold shadow-glow active:scale-95 transition"
          >
            Arrancar una salida
          </button>
        </div>
      </div>
    )
  }

  const parts = ultima.participantes.map((id) => profileById(db, id)).filter(Boolean)

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-display font-bold text-white">En vivo ⚡</h1>
        <p className="text-sm text-gray-500">Última salida · votá retos, MVP y apuestas</p>
      </header>

      <div className="px-4">
        <button
          onClick={() => onOpenSalida(ultima.id)}
          className="w-full text-left rounded-2xl bg-white/5 border border-white/10 p-4 mb-5 active:scale-[0.99] transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{ultima.lugar || 'Salida'}</p>
              <p className="text-xs text-gray-500">{formatFecha(ultima.fecha)}</p>
            </div>
            <span className="text-brand-300 text-sm">Abrir →</span>
          </div>
          <div className="flex -space-x-2 mt-3">
            {parts.map((p) => p && <Avatar key={p.id} profile={p} size={26} />)}
          </div>
        </button>

        <div className="space-y-7">
          <RetoSection salidaId={ultima.id} meId={meId} />
          <ApuestaSection salidaId={ultima.id} meId={meId} />
          <MvpSection salidaId={ultima.id} meId={meId} />
        </div>
      </div>
    </div>
  )
}
