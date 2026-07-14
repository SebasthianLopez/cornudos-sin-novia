import { useState } from 'react'
import { useDB } from '../lib/store'
import {
  crearApuesta,
  apostar,
  ponerApuestaEnVotacion,
  votarResolucionApuesta,
  cancelarApuesta,
} from '../lib/actions'
import { profileById, resultadoApuesta } from '../lib/points'
import { notificarAmigos } from '../lib/push'
import Avatar from './Avatar'
import type { Apuesta, ID } from '../types'

interface Props {
  salidaId: ID
  meId: ID
}

export default function ApuestaSection({ salidaId, meId }: Props) {
  const db = useDB()
  const [nueva, setNueva] = useState(false)
  const [texto, setTexto] = useState('')
  const [cuota, setCuota] = useState('1.5')

  const apuestas = db.apuestas
    .filter((a) => a.salidaId === salidaId && a.estado !== 'cancelada')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const crear = () => {
    if (!texto.trim()) return
    // acá se escribe "1,5" con coma: normalizamos antes de parsear
    const cuotaNum = parseFloat(cuota.replace(',', '.')) || 1.5
    crearApuesta(salidaId, meId, texto, cuotaNum)
    const yo = profileById(db, meId)?.displayName ?? 'Alguien'
    notificarAmigos(meId, 'Apuesta nueva', `${yo} tiró: "${texto.trim()}" (cuota ${cuotaNum}x). ¿A favor o en contra?`)
    setTexto('')
    setCuota('1.5')
    setNueva(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Apuestas</h2>
        <button
          onClick={() => setNueva((v) => !v)}
          className="text-xs font-semibold text-brand-300 px-3 py-1.5 rounded-lg bg-brand-500/10 active:scale-95 transition"
        >
          ＋ Nueva
        </button>
      </div>

      {nueva && (
        <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-scale-in">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: Fulano se va antes de las 2"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Cuota</span>
            <input
              value={cuota}
              onChange={(e) => setCuota(e.target.value)}
              inputMode="decimal"
              className="w-20 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center focus:border-brand-500 focus:outline-none"
            />
            <span className="text-xs text-gray-600">si acertás ganás apostado×(cuota−1)</span>
            <button
              onClick={crear}
              className="ml-auto px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold active:scale-95 transition"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apuestas.map((a) => (
          <ApuestaCard key={a.id} apuesta={a} meId={meId} />
        ))}
        {apuestas.length === 0 && !nueva && (
          <p className="text-xs text-gray-600 text-center py-3">
            Sin apuestas todavía. Tirá una y a ver quién se anima.
          </p>
        )}
      </div>
    </section>
  )
}

function ApuestaCard({ apuesta, meId }: { apuesta: Apuesta; meId: ID }) {
  const db = useDB()
  const [puntos, setPuntos] = useState('20')
  const parts = db.apuestaParticipaciones.filter((p) => p.apuestaId === apuesta.id)
  const miParte = parts.find((p) => p.profileId === meId)
  const proponente = profileById(db, apuesta.propuestaPor)
  const resuelta = apuesta.estado === 'cumplida' || apuesta.estado === 'no_cumplida'

  const votos = db.apuestaVotosResolucion.filter((v) => v.apuestaId === apuesta.id)
  const si = votos.filter((v) => v.voto).length
  const no = votos.filter((v) => !v.voto).length
  const miVoto = votos.find((v) => v.votanteId === meId)

  const estadoBadge = {
    abierta: { t: 'Abierta', c: 'bg-green-500/20 text-green-300' },
    en_votacion: { t: 'En votación', c: 'bg-amber-500/20 text-amber-300' },
    cumplida: { t: 'Se cumplió ✓', c: 'bg-brand-500/20 text-brand-200' },
    no_cumplida: { t: 'No se cumplió ✗', c: 'bg-red-500/20 text-red-300' },
    cancelada: { t: 'Cancelada', c: 'bg-white/10 text-gray-400' },
  }[apuesta.estado]

  const apostar_ = (lado: boolean) => {
    apostar(apuesta.id, meId, lado, parseInt(puntos) || 20)
  }

  return (
    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-medium leading-tight">{apuesta.texto}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            cuota {apuesta.cuota}x · {proponente ? `propuso ${proponente.displayName}` : 'apuesta de la casa'}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${estadoBadge.c}`}>{estadoBadge.t}</span>
      </div>

      {/* participantes */}
      {parts.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {parts.map((p) => {
            const prof = profileById(db, p.profileId)
            const res = resuelta ? resultadoApuesta(db, apuesta.id, p.profileId) : null
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                {prof && <Avatar profile={prof} size={20} />}
                <span className="text-gray-300">{prof?.displayName}</span>
                <span className={`px-1.5 py-0.5 rounded ${p.lado ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                  {p.lado ? 'a favor' : 'en contra'} · {p.puntosApostados}pts
                </span>
                {res !== null && (
                  <span className={`ml-auto font-semibold ${res >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {res >= 0 ? '+' : ''}
                    {res}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* acciones según estado */}
      {apuesta.estado === 'abierta' && (
        <div className="mt-3">
          {miParte ? (
            <p className="text-xs text-gray-500">
              Apostaste {miParte.puntosApostados}pts {miParte.lado ? 'a favor' : 'en contra'}. Podés cambiar:
            </p>
          ) : (
            <p className="text-xs text-gray-500 mb-1.5">¿Vos qué decís?</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <input
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
              inputMode="numeric"
              className="w-16 px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={() => apostar_(true)}
              className="flex-1 py-2 rounded-xl bg-green-500/20 text-green-300 text-sm font-semibold active:scale-95 transition"
            >
              A favor
            </button>
            <button
              onClick={() => apostar_(false)}
              className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-300 text-sm font-semibold active:scale-95 transition"
            >
              En contra
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => ponerApuestaEnVotacion(apuesta.id)}
              className="flex-1 py-2 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-semibold active:scale-95 transition"
            >
              Cerrar apuestas → votar resultado
            </button>
            {(apuesta.propuestaPor === meId || apuesta.propuestaPor === 'app') && (
              <button onClick={() => cancelarApuesta(apuesta.id)} className="px-3 py-2 rounded-lg text-xs text-gray-500">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {apuesta.estado === 'en_votacion' && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1.5">¿Se cumplió? Votá:</p>
          <div className="flex gap-2">
            <button
              onClick={() => votarResolucionApuesta(apuesta.id, meId, true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                miVoto?.voto === true ? 'bg-green-500/30 text-green-300' : 'bg-white/5 text-gray-300'
              }`}
            >
              Sí ({si})
            </button>
            <button
              onClick={() => votarResolucionApuesta(apuesta.id, meId, false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                miVoto?.voto === false ? 'bg-red-500/30 text-red-300' : 'bg-white/5 text-gray-300'
              }`}
            >
              No ({no})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
