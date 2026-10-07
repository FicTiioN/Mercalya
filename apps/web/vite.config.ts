import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const raizMonorepo = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ command, mode }) => {
  // Build de producao sem a URL da API geraria um app que chama o vazio. O
  // erro aqui aparece no deploy, nao na tela de login do cliente.
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    if (!env.VITE_API_URL) {
      throw new Error(
        'VITE_API_URL nao definido. O build de producao precisa da URL publica da API ' +
          '(ex.: VITE_API_URL=https://api.mercalya.com.br/api).',
      )
    }
  }

  return {
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
  }
})
