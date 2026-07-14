import { useRef, useState } from 'react'
import { useDB } from '../lib/store'
import { logout } from '../lib/auth'
import { avatarPath, uploadDataUrl } from '../lib/storage'
import { updateProfile, setPuntosTrago, setPuntosConfig } from '../lib/actions'
import { rankingRowFor, TRAGO_CODIGOS } from '../lib/points'
import { insigniasDe } from '../lib/badges'
import { rachaDe } from '../lib/streak'
import { fileToDataUrl, formatPuntos } from '../lib/format'
import Avatar from '../components/Avatar'
import Sheet from '../components/Sheet'
import type { DB, ID, Profile, TragoCodigo } from '../types'

interface Props {
  meId: ID
  onWrapped: () => void
}

export default function Perfil({ meId, onWrapped }: Props) {
  const db = useDB()
  const me = db.profiles.find((p) => p.id === meId)
  const [editOpen, setEditOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [invitarOpen, setInvitarOpen] = useState(false)

  if (!me) return null

  const row = rankingRowFor(db, meId)
  const rank = rankOf(db, meId)
  const insignias = insigniasDe(db, meId)
  const racha = rachaDe(db, meId)

  return (
    <div className="pb-6">
      {/* hero */}
      <div className="px-4 pt-8 pb-5 text-center">
        <Avatar profile={me} size={96} ring className="mx-auto" />
        <h1 className="mt-3 text-2xl font-display font-bold text-white">{me.displayName}</h1>
        <div className="mt-2 inline-flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            <b className={row && row.puntosTotal < 0 ? 'text-red-400' : 'text-brand-300'}>
              {formatPuntos(row?.puntosTotal ?? 0)}
            </b>{' '}
            pts
          </span>
          <span className="text-gray-400">
            #<b className="text-white">{rank}</b> del ranking
          </span>
          {racha > 0 && (
            <span className="text-gray-400">
              racha <b className="text-amber-300">{racha}</b>
            </span>
          )}
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 active:scale-95 transition"
        >
          Editar perfil
        </button>
      </div>

      {/* insignias */}
      <div className="px-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Insignias</h2>
        {insignias.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {insignias.map((b) => (
              <div
                key={b.codigo}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-left"
              >
                <p className="text-xs font-semibold text-brand-200 leading-tight">{b.nombre}</p>
                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{b.descripcion}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">Todavía no ganaste ninguna. ¡A romperla!</p>
        )}
      </div>

      {/* acciones */}
      <div className="px-4 space-y-2">
        <MenuRow label="Invitar amigos" onClick={() => setInvitarOpen(true)} />
        <MenuRow label="Mi Wrapped del año" onClick={onWrapped} />
        <MenuRow label="Configurar puntos" onClick={() => setConfigOpen(true)} />
        <MenuRow label="Cerrar sesión" onClick={logout} danger />
      </div>

      <p className="text-center text-[11px] text-gray-700 mt-6">Cornudos sin Novia</p>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Editar perfil">
        <EditProfile me={me} onDone={() => setEditOpen(false)} />
      </Sheet>

      <Sheet open={configOpen} onClose={() => setConfigOpen(false)} title="Configurar puntos">
        <ConfigPuntos />
      </Sheet>

      <Sheet open={invitarOpen} onClose={() => setInvitarOpen(false)} title="Invitar amigos">
        <Invitar />
      </Sheet>
    </div>
  )
}

function rankOf(db: DB, meId: ID): number {
  const all = db.profiles.map((p) => ({ id: p.id, pts: rankingRowFor(db, p.id)?.puntosTotal ?? 0 }))
  all.sort((a, b) => b.pts - a.pts)
  return all.findIndex((x) => x.id === meId) + 1
}

function MenuRow({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/5 active:scale-[0.99] transition"
    >
      <span className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-200'}`}>{label}</span>
      <span className="ml-auto text-gray-600">›</span>
    </button>
  )
}

const APP_URL = 'https://sebasthianlopez.github.io/cornudos-sin-novia/'

function Invitar() {
  const db = useDB()
  const [copiado, setCopiado] = useState(false)
  const codigo = db.puntosConfig.codigoGrupo
  const texto = `Sumate a Cornudos sin Novia: ${APP_URL} — Código de invitación: ${codigo}`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard bloqueado: queda el texto visible para copiar a mano */
    }
  }

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
        return
      } catch {
        /* canceló el share */
      }
    } else {
      void copiar()
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Pasales el link y el código. Se registran con su nombre, su foto y un PIN propio.
      </p>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-xs text-gray-500">Link de la app</p>
        <p className="text-sm text-brand-300 break-all mt-1">{APP_URL}</p>
        <p className="text-xs text-gray-500 mt-3">Código de invitación</p>
        <p className="text-3xl font-display font-bold text-white tracking-[0.3em] mt-1">{codigo}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => void compartir()}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-neon-fuchsia text-white font-semibold active:scale-[0.98] transition"
        >
          Compartir
        </button>
        <button
          onClick={() => void copiar()}
          className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-semibold active:scale-[0.98] transition"
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

function EditProfile({ me, onDone }: { me: Profile; onDone: () => void }) {
  const [nombre, setNombre] = useState(me.displayName)
  const [avatar, setAvatar] = useState(me.avatar)
  const [pin, setPin] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (f?: File) => {
    if (!f) return
    try {
      setAvatar(await fileToDataUrl(f, 500))
    } catch {
      /* ignore */
    }
  }

  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      // foto nueva → Storage (con fallback al dataURL si falla la subida)
      let avatarFinal = avatar
      if (avatarFinal.startsWith('data:')) {
        avatarFinal = (await uploadDataUrl(avatarPath(me.id), avatarFinal)) ?? avatarFinal
      }
      const patch: Partial<Profile> = { displayName: nombre.trim() || me.displayName, avatar: avatarFinal }
      if (/^\d{4}$/.test(pin)) patch.pin = pin
      updateProfile(me.id, patch)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()} className="mx-auto block active:scale-95 transition">
        {avatar ? (
          <img src={avatar} alt="" className="w-24 h-24 rounded-full object-cover ring-2 ring-brand-500 mx-auto" />
        ) : (
          <Avatar profile={{ ...me, avatar: '' }} size={96} ring className="mx-auto" />
        )}
        <span className="text-xs text-brand-300 mt-2 block">Cambiar foto</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <div>
        <label className="text-xs text-gray-500">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Nuevo PIN (dejalo vacío para no cambiarlo)</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          placeholder="••••"
          className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-center tracking-[0.5em] focus:border-brand-500 focus:outline-none"
        />
      </div>
      <button
        onClick={() => void save()}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}

const TRAGO_LABEL: Record<TragoCodigo, string> = {
  cerveza: 'Cerveza',
  fernet: 'Fernet',
  whisky: 'Whisky',
  ron: 'Ron',
}

function ConfigPuntos() {
  const db = useDB()
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Cuántos puntos vale cada cosa. Se aplica a todo el ranking.</p>
      <div className="space-y-2">
        {TRAGO_CODIGOS.map((c) => {
          const t = db.tragoTipos.find((x) => x.codigo === c)!
          return (
            <ConfigRow
              key={c}
              label={TRAGO_LABEL[c]}
              value={t.puntosPorUnidad}
              onChange={(v) => setPuntosTrago(c, v)}
            />
          )
        })}
        <ConfigRow label="Rechazo" value={db.puntosConfig.rechazo} onChange={(v) => setPuntosConfig({ rechazo: v })} />
        <ConfigRow label="MVP (bonus)" value={db.puntosConfig.mvpBonus} onChange={(v) => setPuntosConfig({ mvpBonus: v })} />
        <ConfigRow label="Reto (bonus)" value={db.puntosConfig.retoBonus} onChange={(v) => setPuntosConfig({ retoBonus: v })} />
        <ConfigRow
          label="Puntos iniciales"
          value={db.puntosConfig.puntosIniciales}
          step={50}
          onChange={(v) => setPuntosConfig({ puntosIniciales: v })}
        />
      </div>
    </div>
  )
}

function ConfigRow({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5">
      <span className="text-sm text-gray-200">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - step))} className="w-8 h-8 rounded-full bg-white/5 text-gray-300 active:scale-90">
          −
        </button>
        <span className="min-w-10 text-center font-bold text-brand-300 tabular-nums">{value}</span>
        <button onClick={() => onChange(value + step)} className="w-8 h-8 rounded-full bg-brand-500 text-white active:scale-90">
          +
        </button>
      </div>
    </div>
  )
}
