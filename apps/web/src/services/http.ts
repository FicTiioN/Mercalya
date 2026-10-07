/**
 * Transporte HTTP contra a API.
 *
 * Único caminho de dados do frontend: não há mais mock nem `localStorage` de
 * domínio. O que persiste aqui é só o token da sessão.
 */

// O padrão local só existe em desenvolvimento: no build de produção o
// `vite.config.ts` exige VITE_API_URL, e este literal nem entra no bundle.
const BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/api' : '')

/** Token em memória. Quem persiste é o AuthService — componente não toca nisso. */
let token: string | null = null

export function definirToken(novo: string | null): void {
  token = novo
}

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }

  /** Sessão ausente, expirada ou adulterada. */
  get naoAutorizado(): boolean {
    return this.status === 401
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  corpo?: unknown
  sinal?: AbortSignal
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  let resposta: Response

  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      headers: {
        ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: opcoes.sinal,
    })
  } catch {
    // fetch só rejeita por rede/CORS. Erro de status vem em resposta.ok.
    throw new ErroApi(0, 'Não foi possível falar com o servidor. Verifique se a API está no ar.')
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    throw new ErroApi(resposta.status, mensagemDe(corpo, resposta.status))
  }

  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

/** O Nest devolve `message` como string ou array (erros de validação). */
function mensagemDe(corpo: unknown, status: number): string {
  if (corpo && typeof corpo === 'object' && 'message' in corpo) {
    const { message } = corpo as { message: unknown }
    if (typeof message === 'string') return message
    if (Array.isArray(message) && message.length > 0) return String(message[0])
  }
  return `Falha na requisição (${status}).`
}
