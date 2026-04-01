import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@buddy': path.resolve(__dirname, 'src/buddy'),
    },
  },
  // Bind IPv4 explicitly so `wait-on http://127.0.0.1:5187` and Electron loadURL match.
  // On some macOS setups `localhost` is IPv6-only and the dev script would hang forever.
  server: {
    host: '127.0.0.1',
    port: 5187,
    strictPort: true,
  },
})
