import { useState } from 'react'

// "Qué hay de nuevo": una línea que aparece una sola vez después de cada
// auto-update (compara el build actual contra el último visto en este celu).
// ACTUALIZAR este texto en cada versión que valga la pena anunciar.
const NOVEDADES =
  'Notificaciones, rivalidades, castigo del mes, lugares del grupo, insignias nuevas y tarjeta para compartir la noche.'

const KEY = 'csn_novedades_build'

export default function Novedades() {
  const [visible, setVisible] = useState(() => {
    try {
      const visto = localStorage.getItem(KEY)
      if (visto === __BUILD_ID__) return false
      if (visto === null) {
        // primera vez que abre la app: no hay update que anunciar
        localStorage.setItem(KEY, __BUILD_ID__)
        return false
      }
      return true
    } catch {
      return false
    }
  })

  const cerrar = () => {
    try {
      localStorage.setItem(KEY, __BUILD_ID__)
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2 animate-fade-up">
      <p className="flex-1 text-xs text-gray-300 leading-snug">
        <b className="text-brand-300">La app se actualizó.</b> {NOVEDADES}
      </p>
      <button onClick={cerrar} className="text-gray-500 text-sm px-1 active:scale-90 transition" aria-label="Cerrar">
        ✕
      </button>
    </div>
  )
}
