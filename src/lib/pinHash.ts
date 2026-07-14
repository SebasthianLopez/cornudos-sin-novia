// Hash del PIN con Web Crypto: SHA-256 de `${profileId}:${pin}` (el id actúa
// de salt). No es seguridad de banco — evita que el PIN quede legible en la
// DB/repo público y que se pueda reusar el hash entre perfiles.
export const HASH_PREFIX = 'sha256:'

export async function hashPin(pin: string, profileId: string): Promise<string> {
  const data = new TextEncoder().encode(`${profileId}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return HASH_PREFIX + hex
}

export function esPinHasheado(guardado: string): boolean {
  return guardado.startsWith(HASH_PREFIX)
}

/** Compara un PIN tipeado contra lo guardado (hash nuevo o texto plano viejo). */
export async function verificarPin(pin: string, guardado: string, profileId: string): Promise<boolean> {
  if (esPinHasheado(guardado)) return (await hashPin(pin, profileId)) === guardado
  return guardado === pin
}
