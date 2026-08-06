import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api requests from the dev server are forwarded to the backend.
      // This avoids CORS issues entirely in development — no browser policy
      // applies since both origins resolve to localhost:5173.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
