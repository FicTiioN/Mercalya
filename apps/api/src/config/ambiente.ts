import { Logger } from '@nestjs/common'

/**
 * Validação das variáveis de ambiente, rodada pelo `ConfigModule` antes de
 * qualquer módulo subir.
 *
 * Configuração errada precisa derrubar o boot com uma mensagem clara. O
 * contrário é a API no ar assinando tokens com `troque-me`, ou o navegador
 * barrando toda chamada por CORS, com o motivo enterrado no log.
 *
 * Em desenvolvimento, o que só é perigoso em produção vira aviso, não erro:
 * quem acabou de clonar o projeto precisa conseguir subir a API.
 */

export const AMBIENTES = ['development', 'test', 'production'] as const
export type NomeAmbiente = (typeof AMBIENTES)[number]

/** Abaixo disso, um segredo HMAC fica ao alcance de força bruta offline. */
export const TAMANHO_MINIMO_JWT_SECRET = 32

/** Os valores de exemplo do `.env.example`: copiar sem trocar é o erro mais comum. */
const SEGREDOS_DE_EXEMPLO = new Set(['troque-me'])

type Variaveis = Record<string, unknown>

export interface ResultadoAmbiente {
  ambiente: NomeAmbiente
  erros: string[]
  avisos: string[]
}

/**
 * Confere as variáveis e separa o que impede o boot do que só merece aviso.
 *
 * As mensagens nunca repetem o valor da variável: segredo e senha do banco não
 * podem acabar no log.
 */
export function verificarAmbiente(env: Variaveis): ResultadoAmbiente {
  const erros: string[] = []
  const avisos: string[] = []

  const nodeEnv = texto(env.NODE_ENV) || 'development'
  const ambiente = AMBIENTES.find((a) => a === nodeEnv)
  if (!ambiente) {
    erros.push(`NODE_ENV="${nodeEnv}" não é válido. Use ${AMBIENTES.join(', ')}.`)
  }
  const producao = ambiente === 'production'

  // Em produção é erro; fora dela, aviso. Um lugar só decide, para as regras
  // abaixo não repetirem o if.
  const exigirEmProducao = (mensagem: string) => (producao ? erros : avisos).push(mensagem)

  const databaseUrl = texto(env.DATABASE_URL)
  if (!databaseUrl) {
    erros.push('DATABASE_URL não definido.')
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    erros.push('DATABASE_URL precisa começar com postgresql://.')
  }

  const jwtSecret = texto(env.JWT_SECRET)
  if (!jwtSecret) {
    erros.push('JWT_SECRET não definido.')
  } else if (SEGREDOS_DE_EXEMPLO.has(jwtSecret)) {
    exigirEmProducao('JWT_SECRET ainda é o valor de exemplo do .env.example.')
  } else if (jwtSecret.length < TAMANHO_MINIMO_JWT_SECRET) {
    exigirEmProducao(
      `JWT_SECRET tem ${jwtSecret.length} caracteres; o mínimo é ${TAMANHO_MINIMO_JWT_SECRET}.`,
    )
  }

  if (producao && !texto(env.CORS_ORIGIN)) {
    // Fora de produção o main.ts cai no Vite local; em produção não existe
    // padrão que sirva, e o front inteiro pararia por CORS.
    erros.push('CORS_ORIGIN não definido. Informe o domínio do frontend.')
  }

  const porta = texto(env.PORT)
  if (porta && !portaValida(porta)) {
    erros.push(`PORT="${porta}" não é uma porta válida (1 a 65535).`)
  }

  return { ambiente: ambiente ?? 'development', erros, avisos }
}

/**
 * O `validate` do `ConfigModule`: devolve as variáveis com `NODE_ENV`
 * preenchido, ou lança com **todos** os problemas de uma vez. Corrigir um,
 * subir e descobrir o próximo é o tipo de ciclo que atrasa um deploy.
 */
export function validarAmbiente(env: Variaveis): Variaveis {
  const { ambiente, erros, avisos } = verificarAmbiente(env)

  const logger = new Logger('Ambiente')
  avisos.forEach((aviso) => logger.warn(aviso))

  if (erros.length > 0) {
    throw new Error(
      `Configuração inválida (NODE_ENV=${ambiente}):\n${erros.map((e) => `  - ${e}`).join('\n')}\n` +
        'Veja apps/api/.env.example.',
    )
  }

  return { ...env, NODE_ENV: ambiente }
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function portaValida(valor: string): boolean {
  if (!/^\d+$/.test(valor)) return false
  const numero = Number(valor)
  return numero >= 1 && numero <= 65535
}
