import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador único de cada build. La app instalada compara el suyo contra el
// version.json publicado (src/main.tsx) y se recarga sola si hay versión nueva.
const buildId = new Date().toISOString()

// base './' para que el build funcione en subcarpetas (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'emitir-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildId }),
        })
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
})
