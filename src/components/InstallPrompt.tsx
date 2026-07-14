import { useEffect, useState } from 'react'

// Prompt de instalación de la PWA. En Android/desktop usa el evento nativo
// `beforeinstallprompt`; en iOS (que no lo dispara) mostramos instrucciones.
interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('csn_install_dismissed') === '1'
    } catch {
      return false
    }
  })
  const [showIosHelp, setShowIosHelp] = useState(false)

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - iOS Safari
    window.navigator.standalone === true

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem('csn_install_dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  if (isStandalone || dismissed) return null
  if (!deferred && !isIos) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-3 animate-fade-up">
      <div className="flex items-start gap-3">
        <img src="./icon-192.png" alt="" className="w-9 h-9 rounded-xl object-cover" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Instalá la app en tu celu</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {isIos
              ? 'Tocá Compartir y después "Agregar a inicio".'
              : 'Se abre como una app, sin ocupar tienda.'}
          </p>
          {showIosHelp && (
            <p className="text-xs text-brand-200 mt-2">
              Compartir <span className="mx-1">⎋</span> → Agregar a pantalla de inicio → Agregar
            </p>
          )}
          <div className="flex gap-2 mt-2">
            {deferred ? (
              <button
                onClick={async () => {
                  await deferred.prompt()
                  await deferred.userChoice
                  setDeferred(null)
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500 text-white active:scale-95 transition"
              >
                Instalar
              </button>
            ) : (
              <button
                onClick={() => setShowIosHelp((v) => !v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500 text-white active:scale-95 transition"
              >
                Cómo
              </button>
            )}
            <button onClick={close} className="text-xs px-3 py-1.5 rounded-lg text-gray-400">
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
