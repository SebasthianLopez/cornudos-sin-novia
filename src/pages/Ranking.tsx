import { useDB } from '../lib/store'
import { computeRanking, profileById } from '../lib/points'
import { formatPuntos } from '../lib/format'
import LeaderboardRow from '../components/LeaderboardRow'
import type { ID } from '../types'

interface Props {
  meId: ID
  onOpenSalida: (id: ID) => void
}

export default function Ranking({ meId, onOpenSalida }: Props) {
  const db = useDB()
  const ranking = computeRanking(db)

  // salida más reciente para los teasers de reto/apuesta en vivo
  const ultima = [...db.salidas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const retoActivo = ultima?.retoActivoId
    ? db.retoPropuestas.find((r) => r.id === ultima.retoActivoId)
    : null
  const apuestaAbierta = ultima
    ? db.apuestas.find((a) => a.salidaId === ultima.id && a.estado === 'abierta')
    : null

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-display font-bold text-white">Ranking 🏆</h1>
        <p className="text-sm text-gray-500">Acumulado de todas las salidas</p>
      </header>

      {/* teasers en vivo */}
      {(retoActivo || apuestaAbierta) && (
        <div className="px-4 grid grid-cols-2 gap-3 mb-4">
          {apuestaAbierta && (
            <button
              onClick={() => onOpenSalida(apuestaAbierta.salidaId)}
              className="text-left rounded-2xl p-3 bg-gradient-to-br from-brand-600/30 to-brand-500/10 border border-brand-500/30 active:scale-95 transition"
            >
              <p className="text-[10px] uppercase tracking-wide text-brand-300 font-semibold">Apuesta en vivo</p>
              <p className="text-sm text-white font-medium mt-1 leading-tight line-clamp-2">{apuestaAbierta.texto}</p>
              <p className="text-lg font-bold text-brand-200 mt-1">{apuestaAbierta.cuota}x</p>
            </button>
          )}
          {retoActivo && (
            <button
              onClick={() => onOpenSalida(retoActivo.salidaId)}
              className="text-left rounded-2xl p-3 bg-gradient-to-br from-amber-500/25 to-amber-500/5 border border-amber-500/30 active:scale-95 transition"
            >
              <p className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">Reto del día</p>
              <p className="text-sm text-white font-medium mt-1 leading-tight line-clamp-2">{retoActivo.texto}</p>
              <p className="text-lg font-bold text-amber-300 mt-1">+{db.puntosConfig.retoBonus}pts</p>
            </button>
          )}
        </div>
      )}

      {/* leaderboard */}
      <div className="px-2 space-y-1">
        {ranking.map((row, i) => (
          <LeaderboardRow
            key={row.profile.id}
            row={row}
            rank={i + 1}
            isMe={row.profile.id === meId}
            onClick={() => {}}
          />
        ))}
      </div>

      {/* pie: config de puntos activa */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-white/5 border border-white/5 p-3 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-1">Cómo se cuentan los puntos</p>
          <p>
            🍺 cerveza {db.tragoTipos.find((t) => t.codigo === 'cerveza')?.puntosPorUnidad} · fernet{' '}
            {db.tragoTipos.find((t) => t.codigo === 'fernet')?.puntosPorUnidad} · whisky{' '}
            {db.tragoTipos.find((t) => t.codigo === 'whisky')?.puntosPorUnidad} · ron{' '}
            {db.tragoTipos.find((t) => t.codigo === 'ron')?.puntosPorUnidad} · rechazo{' '}
            {db.puntosConfig.rechazo} · MVP +{db.puntosConfig.mvpBonus} · reto +{db.puntosConfig.retoBonus}
          </p>
          {ranking.some((r) => r.puntosTotal < 0) && (
            <p className="text-red-400/80 mt-1">⚠ Ojo: las apuestas perdidas restan y te pueden dejar en rojo.</p>
          )}
          {ultima && (
            <p className="mt-2 text-gray-600">
              Última salida: {ultima.lugar || 'sin lugar'}
              {ultima.mvpGanadorId && ` · MVP ${profileById(db, ultima.mvpGanadorId)?.displayName}`}
              {` · ${formatPuntos(ranking[0]?.puntosTotal ?? 0)} pts el líder`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
