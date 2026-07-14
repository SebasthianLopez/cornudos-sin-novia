import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que el build funcione en subcarpetas (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})
