// Tarjeta-resumen de una salida: imagen 1080×1350 (4:5, ideal para WhatsApp y
// stories) generada con canvas — sin librerías, la CSP no permite CDNs.
// Estética de la app: fondo oscuro, acentos violeta/fucsia, avatares como
// círculo de color con inicial (sin fotos: el canvas queda limpio y no
// depende de CORS de Storage).
import type { DB, ID, Profile } from '../types'
import { profileById, puntosCompletosEnSalida } from './points'
import { formatFecha, formatPuntos } from './format'

const W = 1080
const H = 1350

export async function generarTarjetaSalida(db: DB, salidaId: ID): Promise<Blob | null> {
  const salida = db.salidas.find((s) => s.id === salidaId)
  if (!salida) return null

  const filas: { profile: Profile; puntos: number }[] = []
  for (const id of salida.participantes) {
    const profile = profileById(db, id)
    if (profile) filas.push({ profile, puntos: puntosCompletosEnSalida(db, salidaId, id) })
  }
  filas.sort((a, b) => b.puntos - a.puntos)
  filas.splice(8)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // fondo oscuro con brillos de marca
  ctx.fillStyle = '#08080c'
  ctx.fillRect(0, 0, W, H)
  const glow1 = ctx.createRadialGradient(W * 0.85, 120, 0, W * 0.85, 120, 500)
  glow1.addColorStop(0, 'rgba(168,85,247,0.22)')
  glow1.addColorStop(1, 'rgba(168,85,247,0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, W, H)
  const glow2 = ctx.createRadialGradient(100, H - 150, 0, 100, H - 150, 550)
  glow2.addColorStop(0, 'rgba(217,70,239,0.16)')
  glow2.addColorStop(1, 'rgba(217,70,239,0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, H)

  // encabezado
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#a78bfa'
  ctx.font = '600 34px system-ui, sans-serif'
  ctx.fillText('CORNUDOS SIN NOVIA', 72, 110)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 76px system-ui, sans-serif'
  const titulo = salida.lugar.trim() || 'La salida'
  ctx.fillText(recortar(ctx, titulo, W - 144), 72, 205)

  ctx.fillStyle = '#9ca3af'
  ctx.font = '400 38px system-ui, sans-serif'
  ctx.fillText(formatFecha(salida.fecha), 72, 265)

  // ranking de la noche
  const topY = 340
  const rowH = 104
  filas.forEach((r, i) => {
    const y = topY + i * rowH

    // tarjeta de la fila
    ctx.fillStyle = i === 0 ? 'rgba(168,85,247,0.16)' : 'rgba(255,255,255,0.05)'
    roundRect(ctx, 60, y, W - 120, rowH - 14, 26)
    ctx.fill()

    // posición
    ctx.fillStyle = i === 0 ? '#e9d5ff' : '#6b7280'
    ctx.font = 'bold 42px system-ui, sans-serif'
    ctx.fillText(String(i + 1), 96, y + 60)

    // avatar: círculo del color del perfil con la inicial
    const cx = 200
    const cy = y + 45
    ctx.fillStyle = r.profile.color || '#a855f7'
    ctx.beginPath()
    ctx.arc(cx, cy, 32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 34px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText((r.profile.displayName[0] || '?').toUpperCase(), cx, cy + 12)
    ctx.textAlign = 'left'

    // nombre + etiqueta MVP
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '600 42px system-ui, sans-serif'
    const nombre = recortar(ctx, r.profile.displayName, 520)
    ctx.fillText(nombre, 260, y + 60)
    if (salida.mvpGanadorId === r.profile.id) {
      const wNombre = ctx.measureText(nombre).width
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 30px system-ui, sans-serif'
      ctx.fillText('MVP', 260 + wNombre + 24, y + 58)
    }

    // puntos
    ctx.fillStyle = i === 0 ? '#d8b4fe' : '#a78bfa'
    ctx.font = 'bold 46px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${formatPuntos(r.puntos)} pts`, W - 96, y + 62)
    ctx.textAlign = 'left'
  })

  // pie: dato de la noche
  const pieY = topY + filas.length * rowH + 60
  const tragosGrupo = db.registrosTrago
    .filter((t) => t.salidaId === salidaId)
    .reduce((a, t) => a + t.cantidad, 0)
  const apuestaGanada = db.apuestas.find((a) => a.salidaId === salidaId && a.estado === 'cumplida')

  ctx.fillStyle = '#6b7280'
  ctx.font = '400 34px system-ui, sans-serif'
  const dato = apuestaGanada
    ? `Se cumplió: "${apuestaGanada.texto}"`
    : tragosGrupo > 0
      ? `La banda se tomó ${tragosGrupo} ${tragosGrupo === 1 ? 'trago' : 'tragos'}`
      : 'Noche tranqui (por ahora)'
  ctx.fillText(recortar(ctx, dato, W - 144), 72, Math.min(pieY, H - 90))

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Genera la tarjeta y la comparte (share nativo) o la descarga como fallback. */
export async function compartirTarjetaSalida(
  db: DB,
  salidaId: ID
): Promise<'compartida' | 'descargada' | 'error'> {
  const blob = await generarTarjetaSalida(db, salidaId)
  if (!blob) return 'error'
  const file = new File([blob], 'la-noche-cornudos.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch {
      /* canceló el share: no es error */
    }
    return 'compartida'
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'descargada'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string {
  if (ctx.measureText(texto).width <= maxW) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
