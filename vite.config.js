import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Bug fix: Gunakan esbuild (default) bukan terser
    // esbuild sudah built-in, tidak perlu install dependency tambahan
    // lebih cepat build dan cukup optimal untuk project ini
    sourcemap: false,
    // Rollup options untuk chunking yang lebih baik
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // Optimasi untuk PWA
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})