import { useRef, useState } from 'react'
import { useDB } from '../lib/store'
import { login, register, nombreDisponible, necesitaCodigo, codigoValido } from '../lib/auth'
import { fileToDataUrl } from '../lib/format'
import PinPad from '../components/PinPad'
import Avatar from '../components/Avatar'
import type { Profile } from '../types'

type Mode = 'home' | 'login' | 'register'

export default function Auth() {
  const db = useDB()
  const [mode, setMode] = useState<Mode>('home')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  // registro
  const [nombre, setNombre] = useState('')
  const [avatar, setAvatar] = useState('')
  const [codigo, setCodigo] = useState('')
  const [regStep, setRegStep] = useState<'datos' | 'pin'>('datos')
  const fileRef = useRef<HTMLInputElement>(null)

  const pideCodigo = necesitaCodigo()
  const codigoOk = !pideCodigo || codigoValido(codigo)

  const doLogin = (p: string) => {
    if (!selected) return
    const res = login(selected.id, p)
    if (!res.ok) {
      setError(res.error)
      setPin('')
    }
  }

  const onPinChange = (v: string) => {
    setError('')
    setPin(v)
    if (v.length === 4) {
      if (mode === 'login') setTimeout(() => doLogin(v), 120)
    }
  }

  const [saving, setSaving] = useState(false)

  // Recibe el PIN como argumento: leer el estado acá adentro daría el valor
  // del render anterior (closure vieja) y la validación fallaría siempre.
  const doRegister = async (p: string) => {
    if (saving) return
    setSaving(true)
    try {
      const res = await register({ displayName: nombre, pin: p, avatar, codigo })
      if (!res.ok) {
        setError(res.error)
        setPin('')
        setRegStep('pin')
      }
    } finally {
      setSaving(false)
    }
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const url = await fileToDataUrl(file, 500)
      setAvatar(url)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-safe">
      {/* Hero */}
      <div className="pt-16 pb-8 text-center">
        <img src="./icon-192.png" alt="" className="mx-auto w-20 h-20 rounded-3xl object-cover shadow-glow animate-float" />
        <h1 className="mt-5 text-4xl font-display font-bold tracking-tight text-gradient">
          Cornudos sin Novia
        </h1>
        <p className="mt-2 text-gray-400 text-sm">El ranking oficial de la joda</p>
      </div>

      {mode === 'home' && (
        <div className="flex-1 flex flex-col justify-center gap-3 max-w-sm w-full mx-auto animate-fade-up">
          <button
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia font-semibold text-white shadow-glow active:scale-[0.98] transition"
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setMode('register')
              setError('')
              setRegStep('datos')
              setPin('')
            }}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-semibold text-white active:scale-[0.98] transition"
          >
            Sumarme al grupo
          </button>
          <p className="text-center text-xs text-gray-600 mt-4">
            {db.profiles.length} {db.profiles.length === 1 ? 'jugador' : 'jugadores'} en la banda
          </p>
        </div>
      )}

      {mode === 'login' && (
        <div className="flex-1 max-w-sm w-full mx-auto animate-fade-up">
          {!selected ? (
            <>
              <p className="text-center text-gray-400 text-sm mb-5">¿Quién sos?</p>
              {db.profiles.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-6">
                  Todavía no hay nadie registrado.
                  <br />
                  Volvé y tocá <b className="text-gray-300">"Sumarme al grupo"</b>.
                </p>
              )}
              <div className="grid grid-cols-3 gap-4">
                {db.profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p)
                      setPin('')
                      setError('')
                    }}
                    className="flex flex-col items-center gap-2 active:scale-95 transition"
                  >
                    <Avatar profile={p} size={68} ring />
                    <span className="text-sm text-gray-200 font-medium truncate max-w-[80px]">
                      {p.displayName}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 mb-6">
                <Avatar profile={selected} size={72} ring />
                <p className="text-lg font-semibold text-white">Hola, {selected.displayName}</p>
                <p className="text-xs text-gray-500">Poné tu PIN</p>
              </div>
              <PinPad value={pin} onChange={onPinChange} />
              {error && <p className="text-center text-red-400 text-sm mt-4">{error}</p>}
              <button
                onClick={() => {
                  setSelected(null)
                  setPin('')
                  setError('')
                }}
                className="block mx-auto mt-6 text-sm text-gray-500"
              >
                ← No soy yo
              </button>
            </>
          )}
          {!selected && <BackLink onClick={() => setMode('home')} />}
        </div>
      )}

      {mode === 'register' && (
        <div className="flex-1 max-w-sm w-full mx-auto animate-fade-up">
          {regStep === 'datos' ? (
            <>
              <p className="text-center text-gray-400 text-sm mb-6">Creá tu perfil</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mx-auto mb-5 relative block active:scale-95 transition"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="tu foto"
                    className="w-28 h-28 rounded-full object-cover ring-2 ring-brand-500"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full grid place-items-center bg-white/5 border-2 border-dashed border-white/20">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 grid place-items-center text-sm">
                  ＋
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <input
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  setError('')
                }}
                placeholder="Tu nombre / apodo"
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-center text-lg focus:border-brand-500 focus:outline-none"
              />
              {nombre.trim().length >= 2 && !nombreDisponible(nombre) && (
                <p className="text-center text-amber-400 text-xs mt-2">Ese nombre ya está usado.</p>
              )}
              {pideCodigo && (
                <>
                  <input
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))
                      setError('')
                    }}
                    inputMode="numeric"
                    placeholder="Código de invitación"
                    className="w-full mt-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest focus:border-brand-500 focus:outline-none"
                  />
                  {codigo.length >= 4 && !codigoOk && (
                    <p className="text-center text-amber-400 text-xs mt-2">
                      Ese código no es. Pedile el código a quien te invitó.
                    </p>
                  )}
                </>
              )}
              {error && <p className="text-center text-red-400 text-sm mt-3">{error}</p>}
              <button
                disabled={nombre.trim().length < 2 || !nombreDisponible(nombre) || !codigoOk}
                onClick={() => {
                  setRegStep('pin')
                  setPin('')
                }}
                className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia font-semibold text-white shadow-glow active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
              >
                Seguir
              </button>
              <BackLink onClick={() => setMode('home')} />
            </>
          ) : (
            <>
              <p className="text-center text-gray-300 text-sm mb-2">Elegí un PIN de 4 números</p>
              <p className="text-center text-gray-600 text-xs mb-6">Lo usás para entrar cada vez</p>
              <PinPad
                value={pin}
                onChange={(v) => {
                  setError('')
                  setPin(v)
                  if (v.length === 4) setTimeout(() => void doRegister(v), 120)
                }}
              />
              {saving && <p className="text-center text-brand-300 text-sm mt-4 animate-pulse">Creando tu perfil…</p>}
              {error && <p className="text-center text-red-400 text-sm mt-4">{error}</p>}
              <button
                onClick={() => {
                  setRegStep('datos')
                  setPin('')
                  setError('')
                }}
                className="block mx-auto mt-6 text-sm text-gray-500"
              >
                ← Volver
              </button>
            </>
          )}
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="block mx-auto mt-8 text-sm text-gray-500">
      ← Volver
    </button>
  )
}
