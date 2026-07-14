// Helpers de formato y utilidades varias.

export function formatFecha(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatFechaCorta(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

export function hace(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  const mes = Math.floor(d / 30)
  return `hace ${mes} mes${mes > 1 ? 'es' : ''}`
}

export function formatPuntos(n: number): string {
  return new Intl.NumberFormat('es-PY').format(Math.round(n))
}

/** Lee un File y devuelve un dataURL. Redimensiona imágenes para no reventar
 *  localStorage (en Supabase esto será una subida a Storage). */
export function fileToDataUrl(file: File, maxSize = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('video')) {
      // videos: se leen tal cual (el demo local los guarda como dataURL)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return reject(new Error('no canvas'))
      }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
