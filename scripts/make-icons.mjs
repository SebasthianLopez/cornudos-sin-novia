// Genera los PNG del manifest a partir de public/icon.svg.
// Uso: node scripts/make-icons.mjs
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const svg = await readFile(join(pub, 'icon.svg'))
const maskable = await readFile(join(pub, 'icon-maskable.svg'))

await sharp(svg).resize(192, 192).png().toFile(join(pub, 'icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(join(pub, 'icon-512.png'))
await sharp(maskable).resize(512, 512).png().toFile(join(pub, 'icon-maskable-512.png'))

console.log('Iconos PNG generados en public/')
