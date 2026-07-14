import { useState } from 'react'
import { useDB } from '../lib/store'
import {
  setTrago,
  setRechazo,
  toggleParticipante,
  eliminarSalida,
  actualizarSalida,
} from '../lib/actions'
import { profileById, puntosEnSalida, TRAGO_CODIGOS } from '../lib/points'
import { compartirTarjetaSalida } from '../lib/tarjeta'
import { formatFecha, formatPuntos } from '../lib/format'
import StatCounter from '../components/StatCounter'
import MvpSection from '../components/MvpSection'
import RetoSection from '../components/RetoSection'
import ApuestaSection from '../components/ApuestaSection'
import MediaSection from '../components/MediaSection'
import Avatar from '../components/Avatar'
import type { ID, TragoCodigo } from '../types'

interface Props {
  salidaId: ID
  meId: ID
  onBack: () => void
}

const TRAGO_META: Record<TragoCodigo, { icon: string; label: string; accent: string }> = {
  cerveza: { icon: 'C', label: 'Cerveza', accent: '#f59e0b' },
  fernet: { icon: 'F', label: 'Fernet', accent: '#a855f7' },
  whisky: { icon: 'W', label: 'Whisky', accent: '#22d3ee' },
  ron: { icon: 'R', label: 'Ron', accent: '#ec4899' },
}

export default function SalidaDetalle({ salidaId, meId, onBack }: Props) {
  const db = useDB()
  const salida = db.salidas.find((s) => s.id === salidaId)
  const [editando, setEditando] = useState(false)
  const [lugar, setLugar] = useState(salida?.lugar ?? '')
  const [notas, setNotas] = useState(salida?.notas ?? '')
  const [compartiendo, setCompartiendo] = useState<'no' | 'generando' | 'descargada'>('no')

  if (!salida) {
    return (
      <div className="min-h-dvh grid place-items-center text-gray-500">
        <div className="text-center">
          <p>Esta salida ya no existe.</p>
          <button onClick={onBack} className="mt-3 text-brand-300">
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  const soyParticipante = salida.participantes.includes(meId)

  const getVal = (codigo: TragoCodigo) =>
    db.registrosTrago.find((r) => r.salidaId === salidaId && r.profileId === meId && r.tragoCodigo === codigo)
      ?.cantidad ?? 0
  const getRechazos = () =>
    db.rechazos.find((r) => r.salidaId === salidaId && r.profileId === meId)?.cantidad ?? 0

  const guardarEdicion = () => {
    actualizarSalida(salidaId, { lugar, notas })
    setEditando(false)
  }

  const compartirNoche = async () => {
    if (compartiendo === 'generando') return
    setCompartiendo('generando')
    const res = await compartirTarjetaSalida(db, salidaId)
    setCompartiendo(res === 'descargada' ? 'descargada' : 'no')
    if (res === 'descargada') setTimeout(() => setCompartiendo('no'), 2500)
  }

  // resumen de puntos de la noche por participante
  const resumen = salida.participantes
    .map((id) => ({ profile: profileById(db, id), puntos: puntosEnSalida(db, salidaId, id) }))
    .filter((r) => r.profile)
    .sort((a, b) => b.puntos - a.puntos)

  return (
    <div className="min-h-dvh flex flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 glass px-3 py-3 flex items-center gap-2 border-b border-white/5 pt-safe">
        <button onClick={onBack} className="w-9 h-9 grid place-items-center rounded-full bg-white/5 text-gray-300 active:scale-90 transition">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{salida.lugar || 'Salida'}</p>
          <p className="text-xs text-gray-500">{formatFecha(salida.fecha)}</p>
        </div>
        <button
          onClick={() => setEditando((v) => !v)}
          className="w-9 h-9 grid place-items-center rounded-full bg-white/5 text-gray-300 active:scale-90 transition"
        >
          ✎
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-7">
        {/* edición */}
        {editando && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-scale-in">
            <input
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Lugar"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Qué pasó esa noche…"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button onClick={guardarEdicion} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold">
                Guardar
              </button>
              <button
                onClick={() => {
                  eliminarSalida(salidaId)
                  onBack()
                }}
                className="px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* notas */}
        {salida.notas && !editando && (
          <p className="text-sm text-gray-400 italic">"{salida.notas}"</p>
        )}

        {/* mis stats */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Tus stats de la noche</h2>
          {soyParticipante ? (
            <div className="rounded-2xl bg-white/5 border border-white/5 px-4 divide-y divide-white/5">
              {TRAGO_CODIGOS.map((c) => {
                const meta = TRAGO_META[c]
                return (
                  <StatCounter
                    key={c}
                    icon={meta.icon}
                    label={meta.label}
                    accent={meta.accent}
                    value={getVal(c)}
                    onChange={(v) => setTrago(salidaId, meId, c, v)}
                  />
                )
              })}
              <StatCounter
                icon="X"
                label="Rechazos"
                accent="#f43f5e"
                value={getRechazos()}
                onChange={(v) => setRechazo(salidaId, meId, v)}
              />
            </div>
          ) : (
            <div className="text-center py-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-sm text-gray-400 mb-2">No estuviste marcado en esta salida.</p>
              <button
                onClick={() => toggleParticipante(salidaId, meId)}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold active:scale-95 transition"
              >
                Me sumo
              </button>
            </div>
          )}
        </section>

        {/* resumen de la noche */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Resumen de la noche</h2>
          <div className="rounded-2xl bg-white/5 border border-white/5 divide-y divide-white/5">
            {resumen.map((r, i) => (
              <div key={r.profile!.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-center text-sm font-bold text-gray-500">{i + 1}</span>
                <Avatar profile={r.profile!} size={32} />
                <span className="flex-1 text-sm text-gray-200 truncate">{r.profile!.displayName}</span>
                {salida.mvpGanadorId === r.profile!.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">MVP</span>
                )}
                <span className="text-sm font-bold text-brand-300 tabular-nums">{formatPuntos(r.puntos)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => void compartirNoche()}
            disabled={compartiendo === 'generando'}
            className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-60"
          >
            {compartiendo === 'generando'
              ? 'Armando la tarjeta…'
              : compartiendo === 'descargada'
                ? 'Tarjeta descargada'
                : 'Compartir la noche'}
          </button>
        </section>

        <MvpSection salidaId={salidaId} meId={meId} />
        <RetoSection salidaId={salidaId} meId={meId} />
        <ApuestaSection salidaId={salidaId} meId={meId} />
        <MediaSection salidaId={salidaId} meId={meId} />

        <div className="h-4" />
      </div>
    </div>
  )
}
