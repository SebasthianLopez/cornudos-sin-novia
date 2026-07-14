import { useDB } from '../lib/store'
import { votarMvp } from '../lib/actions'
import { profileById } from '../lib/points'
import Avatar from './Avatar'
import type { ID } from '../types'

interface Props {
  salidaId: ID
  meId: ID
}

export default function MvpSection({ salidaId, meId }: Props) {
  const db = useDB()
  const salida = db.salidas.find((s) => s.id === salidaId)
  if (!salida) return null

  const votos = db.mvpVotos.filter((v) => v.salidaId === salidaId)
  const miVoto = votos.find((v) => v.votanteId === meId)?.candidatoId
  const conteo = new Map<ID, number>()
  for (const v of votos) conteo.set(v.candidatoId, (conteo.get(v.candidatoId) ?? 0) + 1)

  const ganador = salida.mvpGanadorId ? profileById(db, salida.mvpGanadorId) : null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">MVP de la noche 🏆</h2>
        <span className="text-xs text-gray-600">+{db.puntosConfig.mvpBonus}pts</span>
      </div>

      {ganador && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/20">
          <Avatar profile={ganador} size={44} ring />
          <div>
            <p className="text-white font-semibold">{ganador.displayName}</p>
            <p className="text-xs text-amber-300">va ganando el MVP</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {salida.participantes.map((id) => {
          const p = profileById(db, id)
          if (!p) return null
          const n = conteo.get(id) ?? 0
          const mine = miVoto === id
          return (
            <button
              key={id}
              onClick={() => votarMvp(salidaId, meId, id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition active:scale-95 ${
                mine ? 'bg-brand-500/15 border-brand-500/40' : 'bg-white/5 border-transparent'
              }`}
            >
              <Avatar profile={p} size={40} ring={mine} />
              <span className="text-xs text-gray-200 truncate max-w-full">{p.displayName}</span>
              <span className="text-[10px] text-gray-500">
                {n} {n === 1 ? 'voto' : 'votos'}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-600 mt-2">Tocá a quién la rompió. Se define por mayoría.</p>
    </section>
  )
}
