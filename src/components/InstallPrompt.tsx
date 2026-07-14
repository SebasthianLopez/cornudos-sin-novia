import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// Instalación de la PWA.
// - Android/desktop (Chrome, Samsung Internet, Edge): evento nativo `beforeinstallprompt`
//   → botón "Instalar" de una.
// - iPhone/iPad: Apple NO dispara ese evento — se instala a mano desde Safari
//   con Compartir → "Agregar a pantalla de inicio"; mostramos los pasos exactos.
// - Navegadores embebidos (WhatsApp, Instagram, Messenger, Telegram): NO pueden
//   instalar (no tienen "Agregar a inicio" ni beforeinstallprompt); se detectan
//   y se guía a abrir el link en el navegador de verdad.

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const APP_URL = 'https://sebasthianlopez.github.io/cornudos-sin-novia/'
const ua = navigator.userAgent
// iPadOS moderno se hace pasar por Mac: Macintosh + pantalla táctil = iPad.
const esIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
const esNavegadorEmbebido = /whatsapp|instagram|fban|fbav|fb_iab|messenger|telegram|line\//i.test(ua)

export const estaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // @ts-expect-error - propiedad solo de Safari iOS
  window.navigator.standalone === true

// beforeinstallprompt llega UNA sola vez, apenas carga la página — se captura a
// nivel módulo para que quede disponible para el banner y para Perfil → Instalar.
let bipEvent: BIPEvent | null = null
const bipListeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  bipEvent = e as BIPEvent
  bipListeners.forEach((fn) => fn())
})

function useBip(): BIPEvent | null {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    bipListeners.add(fn)
    return () => {
      bipListeners.delete(fn)
    }
  }, [])
  return bipEvent
}

async function instalarNativo() {
  if (!bipEvent) return
  await bipEvent.prompt()
  await bipEvent.userChoice
  bipEvent = null
  bipListeners.forEach((fn) => fn())
}

/** Guía completa de instalación según el dispositivo. Se usa en el banner y en Perfil. */
export function ComoInstalar() {
  const deferred = useBip()
  const [copiado, setCopiado] = useState(false)

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard bloqueado: el link queda visible para copiar a mano */
    }
  }

  if (estaInstalada())
    return <p className="text-sm text-gray-400">Ya estás usando la app instalada.</p>

  return (
    <div className="space-y-3">
      {esNavegadorEmbebido && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-semibold text-amber-200">
            Estás dentro de WhatsApp o Instagram
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Desde acá no se puede instalar. Tocá el menú (arriba a la derecha) y elegí{' '}
            <b>{esIos ? '"Abrir en Safari"' : '"Abrir en Chrome"'}</b>, o copiá el link y pegalo
            en el navegador.
          </p>
          <button
            onClick={() => void copiarLink()}
            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-100 active:scale-95 transition"
          >
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
      )}

      {deferred ? (
        <button
          onClick={() => void instalarNativo()}
          className="w-full py-3 rounded-2xl bg-brand-500 text-white font-semibold active:scale-[0.98] transition"
        >
          Instalar ahora
        </button>
      ) : esIos ? (
        <ol className="space-y-2 text-sm text-gray-300">
          <Paso n={1}>
            Abrí <span className="text-brand-300 break-all">{APP_URL}</span> en <b>Safari</b>.
          </Paso>
          <Paso n={2}>
            Tocá el botón <b>Compartir</b> (el cuadrado con la flecha para arriba, en la barra de
            abajo).
          </Paso>
          <Paso n={3}>
            Deslizá para abajo y tocá <b>"Agregar a pantalla de inicio"</b>.
          </Paso>
          <Paso n={4}>
            Tocá <b>Agregar</b>. Listo: queda como una app más, con el ícono del grupo.
          </Paso>
        </ol>
      ) : (
        <ol className="space-y-2 text-sm text-gray-300">
          <Paso n={1}>
            Abrí <span className="text-brand-300 break-all">{APP_URL}</span> en <b>Chrome</b> (o
            Samsung Internet).
          </Paso>
          <Paso n={2}>
            Tocá el menú <b>⋮</b> (arriba a la derecha).
          </Paso>
          <Paso n={3}>
            Tocá <b>"Agregar a la pantalla principal"</b> (o <b>"Instalar app"</b>) y confirmá.
          </Paso>
        </ol>
      )}
    </div>
  )
}

function Paso({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-200 text-[11px] font-bold grid place-items-center">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  )
}

export default function InstallPrompt() {
  const deferred = useBip()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('csn_install_dismissed') === '1'
    } catch {
      return false
    }
  })
  const [abierto, setAbierto] = useState(false)

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem('csn_install_dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  if (estaInstalada() || dismissed) return null
  if (!deferred && !esIos && !esNavegadorEmbebido) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-3 animate-fade-up">
      <div className="flex items-start gap-3">
        <img src="./icon-192.png" alt="" className="w-9 h-9 rounded-xl object-cover" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Instalá la app en tu celu</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {esNavegadorEmbebido
              ? 'Abrila en el navegador para poder instalarla.'
              : esIos && !deferred
                ? 'En iPhone: Compartir y después "Agregar a pantalla de inicio".'
                : 'Se abre como una app, sin ocupar tienda.'}
          </p>
          {abierto && (
            <div className="mt-3">
              <ComoInstalar />
            </div>
          )}
          <div className="flex gap-2 mt-2">
            {deferred && !esNavegadorEmbebido ? (
              <button
                onClick={() => void instalarNativo()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500 text-white active:scale-95 transition"
              >
                Instalar
              </button>
            ) : (
              <button
                onClick={() => setAbierto((v) => !v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500 text-white active:scale-95 transition"
              >
                {abierto ? 'Cerrar pasos' : 'Ver cómo'}
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
