import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Keep the heavy chart library out of the main bundle (admin pages only).
        manualChunks: { charts: ['recharts'] }
      }
    }
  }
})
