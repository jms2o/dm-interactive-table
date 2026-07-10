import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('../shared', import.meta.url)),
      ],
    },
    proxy: {
      '/api': 'http://localhost:4000',
      '/assets': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
