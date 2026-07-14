import { useState } from 'react'
import { useDB } from '../lib/store'
import {
  proponerReto,
  votarReto,
  cerrarVotacionReto,
  marcarCumplido,
  votarConfirmacionReto,
} from '../lib/actions'
import { profileById } from '../lib/points'
import Avatar from './Avatar'
import type { ID } from '../types'

interface Props {
  salidaId: ID
  meId: ID
}

export default function RetoSection({ salidaId, meId }: Props) {
  const db = useDB()
  const salida = db.salidas.find((s) => s.id === salidaId)
  const [texto, setTexto] = useState('')
  if (!salida) return null

  const propuestas = db.retoPropuestas.filter((p) => p.salidaId === salidaId)

  // ---- fase votación ----
  if (!salida.retoActivoId) {
    const votos = db.retoVotos.filter((v) => v.salidaId === salidaId)
    const miVoto = votos.find((v) => v.votanteId === meId)?.propuestaId
    const conteo = new Map<ID, number>()
    for (const v of votos) conteo.set(v.propuestaId, (conteo.get(v.propuestaId) ?? 0) + 1)

    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Reto del día</h2>
          <span className="text-xs text-gray-600">+{db.puntosConfig.retoBonus}pts</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Voten cuál va a ser el reto de esta salida.</p>

        <div className="space-y-2">
          {propuestas.map((p) => {
            const n = conteo.get(p.id) ?? 0
            const mine = miVoto === p.id
            const autor = profileById(db, p.propuestoPor)
            return (
              <button
                key={p.id}
                onClick={() => votarReto(salidaId, p.id, meId)}
                className={`w-full text-left p-3 rounded-2xl border transition active:scale-[0.99] ${
                  mine ? 'bg-brand-500/15 border-brand-500/40' : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white">{p.texto}</span>
                  <span className="text-xs text-brand-300 shrink-0">
                    {n} {n === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-600">propuso {autor?.displayName}</span>
              </button>
            )
          })}
          {propuestas.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-2">Todavía nadie propuso un reto.</p>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Proponé un reto…"
            className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={() => {
              if (texto.trim()) {
                proponerReto(salidaId, meId, texto)
                setTexto('')
              }
            }}
            className="px-4 rounded-full bg-white/10 text-white text-sm font-semibold active:scale-95 transition"
          >
            ＋
          </button>
        </div>

        {propuestas.length > 0 && (
          <button
            onClick={() => cerrarVotacionReto(salidaId)}
            className="w-full mt-3 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-sm font-semibold active:scale-[0.99] transition"
          >
            Cerrar votación y fijar el reto
          </button>
        )}
      </section>
    )
  }

  // ---- fase reto activo ----
  const reto = db.retoPropuestas.find((p) => p.id === salida.retoActivoId)
  if (!reto) return null
  const cumplimientos = db.retoCumplimientos.filter((c) => c.retoPropuestaId === reto.id)
  const yoCumpli = cumplimientos.find((c) => c.profileId === meId)
  const confirmado = cumplimientos.find((c) => c.estado === 'confirmado')

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Reto del día</h2>
        <span className="text-xs text-gray-600">+{db.puntosConfig.retoBonus}pts</span>
      </div>

      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/25">
        <p className="text-white font-medium">{reto.texto}</p>
        {confirmado && (
          <p className="text-sm text-amber-300 mt-2">
            {profileById(db, confirmado.profileId)?.displayName} lo cumplió · +{db.puntosConfig.retoBonus}pts
          </p>
        )}
      </div>

      {!confirmado && (
        <>
          {!yoCumpli && (
            <button
              onClick={() => marcarCumplido(reto.id, meId)}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold active:scale-[0.99] transition"
            >
              ¡Yo lo cumplí!
            </button>
          )}

          {cumplimientos.map((c) => {
            const p = profileById(db, c.profileId)
            const votos = db.retoConfirmacionVotos.filter((v) => v.cumplimientoId === c.id)
            const si = votos.filter((v) => v.voto).length
            const no = votos.filter((v) => !v.voto).length
            const miVoto = votos.find((v) => v.votanteId === meId)
            if (c.estado === 'rechazado') {
              return (
                <p key={c.id} className="text-xs text-red-400/80 mt-3">
                  {p?.displayName} dijo que lo cumplió pero el grupo no le creyó.
                </p>
              )
            }
            return (
              <div key={c.id} className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  {p && <Avatar profile={p} size={28} />}
                  <span className="text-sm text-gray-200">
                    <b>{p?.displayName}</b> dice que lo cumplió. ¿Le creen?
                  </span>
                </div>
                {c.profileId !== meId ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => votarConfirmacionReto(c.id, meId, true)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                        miVoto?.voto === true ? 'bg-green-500/30 text-green-300' : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      Sí ({si})
                    </button>
                    <button
                      onClick={() => votarConfirmacionReto(c.id, meId, false)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                        miVoto?.voto === false ? 'bg-red-500/30 text-red-300' : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      No ({no})
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Esperando que el grupo confirme… (sí {si} · no {no})
                  </p>
                )}
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
