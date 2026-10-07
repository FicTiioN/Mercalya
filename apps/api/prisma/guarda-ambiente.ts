/**
 * Trava dos scripts que escrevem direto no banco (`db:seed`, `db:nova-conta`).
 *
 * O seed apaga todas as tabelas antes de recriar a demonstração. Rodado contra
 * produção, ele destrói os dados de todos os clientes em segundos, e nada no
 * comando avisa: `npm run db:seed` parece igual em qualquer máquina. Por isso
 * a regra é negar por padrão: só passa banco local fora de produção, ou quem
 * declarar a intenção com `PERMITIR_SEED=sim`.
 */

/** Hosts que só alcançam a própria máquina. */
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** O valor exato, para ninguém liberar sem querer com `1` ou `true` herdado de outro script. */
const LIBERACAO = 'sim'

type Ambiente = Record<string, string | undefined>

/**
 * Por que o script não pode rodar, ou `null` se pode.
 *
 * A mensagem nunca repete o `DATABASE_URL`: ele carrega a senha do banco, e a
 * saída de um script costuma acabar em log de CI.
 */
export function motivoParaRecusar(env: Ambiente): string | null {
  if (env.PERMITIR_SEED === LIBERACAO) return null

  if (env.NODE_ENV === 'production') {
    return 'NODE_ENV=production.'
  }

  const url = env.DATABASE_URL
  if (!url) return 'DATABASE_URL não definido.'

  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return 'DATABASE_URL inválido.'
  }

  if (!HOSTS_LOCAIS.has(host)) {
    return `o banco está em "${host}", não nesta máquina.`
  }

  return null
}

/** Encerra o processo antes de qualquer escrita se o banco não for de desenvolvimento. */
export function garantirBancoDeDesenvolvimento(script: string, env: Ambiente = process.env): void {
  const motivo = motivoParaRecusar(env)
  if (!motivo) return

  throw new Error(
    [
      `${script} recusado: ${motivo}`,
      'Este script escreve direto no banco e só roda em banco local de desenvolvimento.',
      `Se for mesmo intencional, rode de novo com PERMITIR_SEED=${LIBERACAO}.`,
    ].join('\n'),
  )
}
