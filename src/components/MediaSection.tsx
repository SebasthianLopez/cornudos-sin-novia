import { useRef, useState } from 'react'
import { uid, useDB } from '../lib/store'
import { subirMedia, reaccionar, comentar, eliminarMedia } from '../lib/actions'
import { MAX_VIDEO_MB, mediaPath, uploadBlob, uploadDataUrl } from '../lib/storage'
import { fileToDataUrl, hace } from '../lib/format'
import { profileById } from '../lib/points'
import Avatar from './Avatar'
import Sheet from './Sheet'
import type { ID, MediaItem } from '../types'

const EMOJIS = ['🔥', '😂', '😮', '❤️', '🍺', '🤮']

interface Props {
  salidaId: ID
  meId: ID
}

export default function MediaSection({ salidaId, meId }: Props) {
  const db = useDB()
  const fileRef = useRef<HTMLInputElement>(null)
  const [openId, setOpenId] = useState<ID | null>(null)
  const [uploading, setUploading] = useState(false)

  const items = db.mediaItems
    .filter((m) => m.salidaId === salidaId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        const esVideo = file.type.startsWith('video')
        const mediaId = uid()
        if (esVideo) {
          if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            alert(`Ese video pesa mucho (máx ${MAX_VIDEO_MB}MB). Mandá un clip más corto 🙏`)
            continue
          }
          // videos: directo a Storage (sin base64)
          const url = await uploadBlob(mediaPath(salidaId, mediaId, file.type), file)
          if (!url) {
            alert('No se pudo subir el video. Probá de nuevo con señal.')
            continue
          }
          subirMedia(salidaId, meId, url, 'video')
        } else {
          // fotos: se comprimen y van a Storage; si falla, queda el dataURL
          const dataUrl = await fileToDataUrl(file)
          const url = await uploadDataUrl(mediaPath(salidaId, mediaId, 'image/jpeg'), dataUrl)
          subirMedia(salidaId, meId, url ?? dataUrl, 'foto')
        }
      } catch {
        /* ignore */
      }
    }
    setUploading(false)
  }

  const open = openId ? items.find((m) => m.id === openId) : null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Feed de la noche 📸</h2>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs font-semibold text-brand-300 px-3 py-1.5 rounded-lg bg-brand-500/10 active:scale-95 transition"
        >
          {uploading ? 'Subiendo…' : '＋ Subir'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {items.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-8 rounded-2xl border border-dashed border-white/15 text-gray-500 text-sm active:scale-[0.99] transition"
        >
          📷 Subí las fotos y videos de la joda
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((m) => {
            const reacs = db.mediaReacciones.filter((r) => r.mediaId === m.id)
            return (
              <button
                key={m.id}
                onClick={() => setOpenId(m.id)}
                className="relative aspect-square rounded-xl overflow-hidden bg-white/5 active:scale-95 transition"
              >
                <MediaThumb item={m} />
                {reacs.length > 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60">
                    {reacs.slice(0, 3).map((r) => r.emoji).join('')} {reacs.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title="">
        {open && <MediaViewer item={open} meId={meId} onDeleted={() => setOpenId(null)} />}
      </Sheet>
    </section>
  )
}

function MediaThumb({ item }: { item: MediaItem }) {
  if (item.tipo === 'video') {
    return (
      <div className="w-full h-full grid place-items-center bg-black/40">
        <span className="text-2xl">▶️</span>
      </div>
    )
  }
  return <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
}

function MediaViewer({ item, meId, onDeleted }: { item: MediaItem; meId: ID; onDeleted: () => void }) {
  const db = useDB()
  const [texto, setTexto] = useState('')
  const autor = profileById(db, item.subidoPor)
  const reacs = db.mediaReacciones.filter((r) => r.mediaId === item.id)
  const comentarios = db.mediaComentarios
    .filter((c) => c.mediaId === item.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const miReaccion = reacs.find((r) => r.profileId === meId)?.emoji

  return (
    <div>
      <div className="rounded-2xl overflow-hidden bg-black/40 mb-3">
        {item.tipo === 'video' ? (
          <video src={item.dataUrl} controls className="w-full max-h-[50vh]" />
        ) : (
          <img src={item.dataUrl} alt="" className="w-full max-h-[50vh] object-contain" />
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {autor && <Avatar profile={autor} size={28} />}
        <span className="text-sm text-gray-300">{autor?.displayName}</span>
        <span className="text-xs text-gray-600">· {hace(item.createdAt)}</span>
        {item.subidoPor === meId && (
          <button
            onClick={() => {
              eliminarMedia(item.id)
              onDeleted()
            }}
            className="ml-auto text-xs text-red-400/70"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* reacciones */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => reaccionar(item.id, meId, e)}
            className={`w-10 h-10 rounded-full grid place-items-center text-lg transition active:scale-90 ${
              miReaccion === e ? 'bg-brand-500/30 ring-1 ring-brand-500' : 'bg-white/5'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      {reacs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {reacs.map((r) => {
            const p = profileById(db, r.profileId)
            return (
              <span key={r.id} className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                {r.emoji} {p?.displayName}
              </span>
            )
          })}
        </div>
      )}

      {/* comentarios */}
      <div className="space-y-2 mb-3">
        {comentarios.map((c) => {
          const p = profileById(db, c.profileId)
          return (
            <div key={c.id} className="flex gap-2">
              {p && <Avatar profile={p} size={26} />}
              <div className="flex-1 bg-white/5 rounded-2xl px-3 py-2">
                <span className="text-xs font-semibold text-gray-300">{p?.displayName}</span>
                <p className="text-sm text-gray-200">{c.texto}</p>
              </div>
            </div>
          )
        })}
        {comentarios.length === 0 && <p className="text-xs text-gray-600 text-center py-2">Sé el primero en comentar</p>}
      </div>

      <div className="flex gap-2 sticky bottom-0 py-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && texto.trim()) {
              comentar(item.id, meId, texto)
              setTexto('')
            }
          }}
          placeholder="Cargá algo…"
          className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={() => {
            if (texto.trim()) {
              comentar(item.id, meId, texto)
              setTexto('')
            }
          }}
          className="px-4 rounded-full bg-brand-500 text-white text-sm font-semibold active:scale-95 transition"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
