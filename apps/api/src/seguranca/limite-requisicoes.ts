import { SetMetadata, type ExecutionContext } from '@nestjs/common'
import type { ThrottlerModuleOptions } from '@nestjs/throttler'
import type { Request } from 'express'

/**
 * Limites de requisição por IP, com uma regra mais dura para o login.
 *
 * O contador é **em memória, por instância**: com duas réplicas, cada uma
 * conta sozinha e o limite efetivo dobra. Basta para uma instância; quando a
 * API escalar, o armazenamento vai para o Postgres ou Redis.
 */

const UM_MINUTO = 60_000

/** Marca a rota cujas tentativas contam para o limite de login. */
const CHAVE_LIMITE_LOGIN = 'mercalya:limite-login'
export const LimiteDeLogin = () => SetMetadata(CHAVE_LIMITE_LOGIN, true)

function ehLogin(contexto: ExecutionContext): boolean {
  return Reflect.getMetadata(CHAVE_LIMITE_LOGIN, contexto.getHandler()) === true
}

/** O e-mail como o login o compara: sem espaços e em minúsculas. */
function emailDaTentativa(req: Request): string {
  const email: unknown = req.body?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export const LIMITES = {
  /** Toda rota, por IP. Um totem consultando o pagamento a cada 1,5 s faz 40/min. */
  geral: { limite: 300, janelaMs: UM_MINUTO },
  /** Mesma conta a partir do mesmo IP: o ataque de força bruta clássico. */
  loginPorConta: { limite: 5, janelaMs: UM_MINUTO, bloqueioMs: 5 * UM_MINUTO },
  /** Mesmo IP testando muitas contas. Folgado para uma loja atrás de um NAT só. */
  loginPorIp: { limite: 30, janelaMs: UM_MINUTO },
} as const

export const MENSAGEM_LIMITE_LOGIN = 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.'
export const MENSAGEM_LIMITE_GERAL = 'Muitas requisições em pouco tempo. Aguarde um instante.'

export const opcoesLimiteRequisicoes: ThrottlerModuleOptions = {
  throttlers: [
    {
      // `default` é o nome que o `@SkipThrottle()` sem argumento desliga.
      name: 'default',
      limit: LIMITES.geral.limite,
      ttl: LIMITES.geral.janelaMs,
    },
    {
      name: 'login-conta',
      limit: LIMITES.loginPorConta.limite,
      ttl: LIMITES.loginPorConta.janelaMs,
      // Estourou: fica bloqueado mais tempo que a janela. Sem isso, o atacante
      // só espera um minuto e manda mais 5.
      blockDuration: LIMITES.loginPorConta.bloqueioMs,
      skipIf: (contexto) => !ehLogin(contexto),
      // IP + e-mail: quem bloqueia a conta é só quem está atacando dela. Por
      // e-mail puro, qualquer um trancaria o dono de fora digitando senhas erradas.
      getTracker: (req) => `${(req as Request).ip}|${emailDaTentativa(req as Request)}`,
    },
    {
      name: 'login-ip',
      limit: LIMITES.loginPorIp.limite,
      ttl: LIMITES.loginPorIp.janelaMs,
      skipIf: (contexto) => !ehLogin(contexto),
    },
  ],
  errorMessage: (contexto) => (ehLogin(contexto) ? MENSAGEM_LIMITE_LOGIN : MENSAGEM_LIMITE_GERAL),
}
