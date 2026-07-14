import { useDB } from '../lib/store'
import { formatFecha, formatPuntos } from '../lib/format'
import { profileById, puntosEnSalida } from '../lib/points'
import Avatar from '../components/Avatar'
import type { ID } from '../types'

interface Props {
  meId: ID
  onOpenSalida: (id: ID) => void
  onNueva: () => void
}

export default function Salidas({ meId, onOpenSalida, onNueva }: Props) {
  const db = useDB()
  const salidas = [...db.salidas].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Salidas</h1>
          <p className="text-sm text-gray-500">{salidas.length} noches registradas</p>
        </div>
        <button
          onClick={onNueva}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-neon-fuchsia text-white text-sm font-semibold shadow-glow-sm active:scale-95 transition"
        >
          ＋ Nueva
        </button>
      </header>

      {salidas.length === 0 && (
        <div className="mt-16 text-center px-8">
          <p className="text-gray-400">Todavía no hay salidas.</p>
          <p className="text-gray-600 text-sm">Cargá la primera noche de joda.</p>
        </div>
      )}

      <div className="px-4 space-y-3">
        {salidas.map((s) => {
          const parts = s.participantes.map((id) => profileById(db, id)).filter(Boolean)
          const misPuntos = puntosEnSalida(db, s.id, meId)
          const fotos = db.mediaItems.filter((m) => m.salidaId === s.id).length
          const mvp = s.mvpGanadorId ? profileById(db, s.mvpGanadorId) : null
          return (
            <button
              key={s.id}
              onClick={() => onOpenSalida(s.id)}
              className="w-full text-left rounded-2xl bg-white/5 border border-white/5 p-4 active:scale-[0.99] hover:bg-white/[0.07] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{s.lugar || 'Salida'}</p>
                  <p className="text-xs text-gray-500">{formatFecha(s.fecha)}</p>
                </div>
                {s.participantes.includes(meId) && (
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand-300">{formatPuntos(misPuntos)}</div>
                    <div className="text-[10px] text-gray-600">tus pts</div>
                  </div>
                )}
              </div>
              {s.notas && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{s.notas}</p>}
              <div className="flex items-center justify-between mt-3">
                <div className="flex -space-x-2">
                  {parts.slice(0, 5).map((p) => p && <Avatar key={p.id} profile={p} size={26} />)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {mvp && <span>MVP {mvp.displayName}</span>}
                  {fotos > 0 && <span>{fotos} {fotos === 1 ? 'foto' : 'fotos'}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
