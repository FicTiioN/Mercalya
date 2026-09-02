import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { urlDeTeste } from './url-de-teste'

/**
 * Roda uma vez por execução da suíte, no processo principal.
 *
 * Cria o banco de teste se não existir e aplica as **mesmas migrações** do
 * banco real — não há `db push` nem schema paralelo. Se uma migração está
 * quebrada, quebra aqui primeiro.
 */
export default async function prepararBanco(): Promise<void> {
  const url = urlDeTeste()
  const nome = new URL(url).pathname.slice(1)

  // Conecta no banco de manutenção do servidor para poder criar o de teste.
  const manutencao = new URL(url)
  manutencao.pathname = '/postgres'

  const admin = new PrismaClient({ datasources: { db: { url: manutencao.toString() } } })
  try {
    const existe = await admin.$queryRawUnsafe<unknown[]>(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      nome,
    )
    if (existe.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${nome}"`)
      console.log(`\nBanco de teste "${nome}" criado.`)
    }
  } finally {
    await admin.$disconnect()
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}
