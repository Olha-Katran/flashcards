import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When VITE_API_URL is unset, RTK Query uses `/api` (same origin) — forward to local backend.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        // Long AI (e.g. PDF) + retries can exceed 3m; keep dev proxy from closing first.
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
})
