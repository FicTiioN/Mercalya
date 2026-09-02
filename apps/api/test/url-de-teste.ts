import { config } from 'dotenv'
import { resolve } from 'node:path'

/**
 * O banco de teste é o de desenvolvimento com sufixo `_test`, no mesmo
 * servidor. `DATABASE_URL_TEST` sobrescreve, para quem preferir outro lugar.
 *
 * Nunca é o banco principal: a suíte cria empresas à vontade, e um deslize
 * apagaria a base de demonstração.
 */
export function urlDeTeste(): string {
  // Não sobrescreve variáveis já definidas — o CI pode injetar as suas.
  config({ path: resolve(__dirname, '..', '.env') })

  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST

  const base =
    process.env.DATABASE_URL ??
    'postgresql://mercalya:mercalya@localhost:5433/mercalya?schema=public'
  const url = new URL(base)
  url.pathname = `${url.pathname}_test`
  return url.toString()
}
