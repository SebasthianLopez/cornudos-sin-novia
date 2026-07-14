import { useState } from 'react'
import { useDB } from '../lib/store'
import { computeRanking, profileById } from '../lib/points'
import { castigadoDelMes, historialCastigos, mesActual, mesAnterior, nombreMes } from '../lib/castigo'
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
  const [historialAbierto, setHistorialAbierto] = useState(false)

  // castigo del mes: el cerrado (mes pasado) manda; el del mes en curso avisa
  const castigoPasado = castigadoDelMes(db, mesAnterior())
  const castigoEnCurso = castigadoDelMes(db, mesActual())
  const historial = historialCastigos(db)

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
        <h1 className="text-2xl font-display font-bold text-white">Ranking</h1>
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

      {/* castigo del mes */}
      {(castigoPasado || castigoEnCurso) && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-[10px] uppercase tracking-wide text-red-300 font-semibold">
              Castigo del mes
            </p>
            {castigoPasado && (
              <p className="text-sm text-white mt-1 leading-snug">
                <b>{castigoPasado.perdedor.displayName}</b> quedó último en{' '}
                {nombreMes(castigoPasado.ym)}
                {castigoPasado.empate ? ' (empatado abajo)' : ''} —{' '}
                {db.puntosConfig.castigoTexto}
              </p>
            )}
            {castigoEnCurso && (
              <p className={`text-xs mt-1 ${castigoPasado ? 'text-gray-500' : 'text-gray-300'}`}>
                Va camino al castigo este mes: <b className="text-gray-200">{castigoEnCurso.perdedor.displayName}</b>{' '}
                ({formatPuntos(castigoEnCurso.puntos)} pts ganados)
              </p>
            )}
            {historial.length > 0 && (
              <button
                onClick={() => setHistorialAbierto((v) => !v)}
                className="text-[11px] text-gray-500 mt-2 active:scale-95 transition"
              >
                {historialAbierto ? 'Ocultar historial' : 'Ver historial de castigados'}
              </button>
            )}
            {historialAbierto &&
              historial.map((c) => (
                <p key={c.ym} className="text-xs text-gray-500 mt-1">
                  {nombreMes(c.ym)}: {c.perdedor.displayName} ({formatPuntos(c.puntos)} pts)
                </p>
              ))}
          </div>
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
            Todos arrancan con {formatPuntos(db.puntosConfig.puntosIniciales)} pts · cerveza{' '}
            {db.tragoTipos.find((t) => t.codigo === 'cerveza')?.puntosPorUnidad} · fernet{' '}
            {db.tragoTipos.find((t) => t.codigo === 'fernet')?.puntosPorUnidad} · whisky{' '}
            {db.tragoTipos.find((t) => t.codigo === 'whisky')?.puntosPorUnidad} · ron{' '}
            {db.tragoTipos.find((t) => t.codigo === 'ron')?.puntosPorUnidad} · rechazo{' '}
            {db.puntosConfig.rechazo} · MVP +{db.puntosConfig.mvpBonus} · reto +{db.puntosConfig.retoBonus}
          </p>
          <p className="mt-1">Las apuestas perdidas restan: se puede caer por debajo de los puntos iniciales.</p>
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
