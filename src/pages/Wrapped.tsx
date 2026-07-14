import { useDB } from '../lib/store'
import { computeWrapped } from '../lib/wrapped'
import { profileById, nombreTrago } from '../lib/points'
import { formatFecha, formatPuntos } from '../lib/format'
import type { ID } from '../types'

interface Props {
  meId: ID
  onBack: () => void
}

export default function Wrapped({ meId, onBack }: Props) {
  const db = useDB()
  const me = profileById(db, meId)
  const year = new Date().getFullYear()
  const w = computeWrapped(db, meId, year)

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-brand-700/40 via-ink-950 to-ink-950">
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center gap-2 pt-safe">
        <button onClick={onBack} className="w-9 h-9 grid place-items-center rounded-full bg-white/10 text-white active:scale-90 transition">
          ←
        </button>
        <h1 className="font-semibold text-white">Tu Wrapped {year}</h1>
      </header>

      <div className="flex-1 px-5 py-4">
        <div className="text-center mb-6 animate-fade-up">
          <h2 className="text-3xl font-display font-bold text-gradient">
            El {year} de {me?.displayName}
          </h2>
        </div>

        {w.salidas === 0 ? (
          <p className="text-center text-gray-400 mt-10">
            Todavía no tenés salidas este año. Arrancá a sumar historias.
          </p>
        ) : (
          <div className="space-y-3">
            <BigStat label="Salidas" value={`${w.salidas}`} />
            <div className="grid grid-cols-2 gap-3">
              <BigStat label="Tragos totales" value={`${w.totalTragos}`} small />
              <BigStat label="Rechazos" value={`${w.rechazos}`} small />
            </div>
            {w.tragoFavorito && w.tragoFavorito.cantidad > 0 && (
              <BigStat
                label="Tu trago favorito"
                value={`${nombreTrago(w.tragoFavorito.codigo)} · ${w.tragoFavorito.cantidad}`}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <BigStat label="MVP" value={`${w.mvps}`} small />
              <BigStat label="Retos" value={`${w.retosCumplidos}`} small />
            </div>
            {w.mejorSalida && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs text-gray-500">Tu mejor noche</p>
                <p className="text-white font-semibold mt-1">{w.mejorSalida.lugar || 'Salida'}</p>
                <p className="text-xs text-gray-500">
                  {formatFecha(w.mejorSalida.fecha)} · {formatPuntos(w.mejorSalida.puntos)} pts
                </p>
              </div>
            )}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-500 to-neon-fuchsia text-center mt-4 shadow-glow">
              <p className="text-white/80 text-sm">Puntos ganados en {year}</p>
              <p className="text-5xl font-display font-bold text-white mt-1">{formatPuntos(w.puntosTotales)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BigStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-display font-bold text-white mt-0.5 ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}
