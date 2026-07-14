// Genera los PNG del ícono de la app a partir de la foto del grupo
// (scripts/icon-source.jpeg). Recorte cuadrado con foco automático en la
// zona con más detalle (las caras). Uso: node scripts/make-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'scripts', 'icon-source.jpeg')
const pub = join(root, 'public')

const make = (size, out) =>
  sharp(source)
    .resize(size, size, { fit: 'cover', position: sharp.strategy.attention })
    .png()
    .toFile(join(pub, out))

await make(192, 'icon-192.png')
await make(512, 'icon-512.png')
// maskable: la misma foto a sangre completa (la zona segura es el centro)
await make(512, 'icon-maskable-512.png')

console.log('Iconos PNG generados en public/ desde la foto del grupo')
