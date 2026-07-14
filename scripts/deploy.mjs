// Publica dist/ en la rama gh-pages (GitHub Pages). Uso: npm run deploy
// (compila primero vía el script "deploy" de package.json).
import { execSync } from 'node:child_process'
import { cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(join(tmpdir(), 'cornudos-deploy-'))
const run = (cmd) => execSync(cmd, { cwd: tmp, stdio: 'inherit' })

try {
  cpSync(join(root, 'dist'), tmp, { recursive: true })
  writeFileSync(join(tmp, '.nojekyll'), '')
  run('git init -b gh-pages')
  run('git add -A')
  run('git commit -m deploy')
  run('git push --force https://github.com/SebasthianLopez/cornudos-sin-novia.git gh-pages:gh-pages')
  console.log('\nPublicado: https://sebasthianlopez.github.io/cornudos-sin-novia/ (tarda ~30s)')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
