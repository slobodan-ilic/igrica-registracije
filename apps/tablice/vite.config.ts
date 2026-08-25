import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The port is pinned, and pinned loudly: regress.mjs looks here by default, and
// a suite that quietly found a different app on a shifted port would report on
// the wrong one. Geografija sits on the next port so both can run at once.
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true } })
