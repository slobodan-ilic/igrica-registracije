import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See apps/tablice/vite.config.ts: pinned so regress.mjs knows where to look.
export default defineConfig({ plugins: [react()], server: { port: 5174, strictPort: true } })
