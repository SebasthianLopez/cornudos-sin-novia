// Subida de archivos a Supabase Storage (bucket público joda-media).
// Devuelven la URL pública, o null si falló (el caller decide el fallback).
import { supabase, SUPABASE_URL } from './supabase'

const BUCKET = 'joda-media'

/** Límite de tamaño para videos (los amigos suben clips, no películas). */
export const MAX_VIDEO_MB = 40

function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

export async function uploadBlob(path: string, blob: Blob): Promise<string | null> {
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'application/octet-stream',
      cacheControl: '31536000',
    })
    if (error) {
      console.warn('[storage]', error.message)
      return null
    }
    return publicUrl(path)
  } catch {
    return null
  }
}

/** Sube un dataURL (imágenes ya comprimidas por fileToDataUrl). */
export async function uploadDataUrl(path: string, dataUrl: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    return await uploadBlob(path, blob)
  } catch {
    return null
  }
}

function extFor(type: string): string {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  if (type.startsWith('video')) {
    if (type.includes('webm')) return 'webm'
    if (type.includes('quicktime')) return 'mov'
    return 'mp4'
  }
  return 'jpg'
}

export function mediaPath(salidaId: string, mediaId: string, mimeType: string): string {
  return `salidas/${salidaId}/${mediaId}.${extFor(mimeType)}`
}

export function avatarPath(profileId: string): string {
  // sufijo aleatorio para romper el caché al cambiar la foto
  return `avatars/${profileId}-${Date.now().toString(36)}.jpg`
}
