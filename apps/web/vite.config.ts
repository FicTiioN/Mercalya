import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const raizMonorepo = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // O dominio vive fora do app (packages/domain) e e' consumido direto do
      // fonte: como so' tem tipos, nao precisa de build intermediario.
      '@mercalya/domain': fileURLToPath(
        new URL('../../packages/domain/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Libera a leitura de packages/* fora da raiz do app.
    fs: { allow: [raizMonorepo] },
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts e o runtime do React mudam pouco: mante-los em chunks
        // proprios melhora o cache entre deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
})
