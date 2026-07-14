import { useState } from 'react'
import { useDB, today } from '../lib/store'
import { crearSalida } from '../lib/actions'
import Avatar from '../components/Avatar'
import type { ID } from '../types'

interface Props {
  meId: ID
  onCreated: (id: ID) => void
  onCancel: () => void
}

export default function NuevaSalida({ meId, onCreated, onCancel }: Props) {
  const db = useDB()
  const [fecha, setFecha] = useState(today())
  const [lugar, setLugar] = useState('')
  const [notas, setNotas] = useState('')
  const [participantes, setParticipantes] = useState<ID[]>([meId])

  const toggle = (id: ID) => {
    setParticipantes((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const submit = () => {
    const id = crearSalida({ fecha, lugar, notas, creadoPor: meId, participantes })
    onCreated(id)
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 glass px-4 py-3 flex items-center justify-between border-b border-white/5 pt-safe">
        <button onClick={onCancel} className="text-gray-400 text-sm">
          Cancelar
        </button>
        <h1 className="font-semibold text-white">Nueva salida</h1>
        <button onClick={submit} className="text-brand-300 text-sm font-semibold">
          Crear
        </button>
      </header>

      <div className="flex-1 px-4 py-5 space-y-5">
        <div>
          <label className="text-xs text-gray-500 font-medium">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">¿Dónde?</label>
          <input
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Boliche, previa, cumple..."
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">Notas / qué pasó (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="El resumen épico de la noche..."
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">¿Quiénes estuvieron?</label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {db.profiles.map((p) => {
              const on = participantes.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition active:scale-95 ${
                    on ? 'bg-brand-500/15 border-brand-500/40' : 'bg-white/5 border-transparent opacity-60'
                  }`}
                >
                  <Avatar profile={p} size={48} ring={on} />
                  <span className="text-xs text-gray-200 truncate max-w-full">{p.displayName}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
