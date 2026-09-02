import { definirToken, ErroApi, requisitar } from './http'

export interface UsuarioSessao {
  id: string
  nome: string
  iniciais: string
  funcao: string
  email: string
}

export interface SessaoAtual {
  usuario: UsuarioSessao
  empresa: { id: string; nome: string }
  lojas: Array<{ id: string; nome: string; condominio: string }>
}

const CHAVE_TOKEN = 'mercalya:token'

/**
 * Sessão em memória. Só é preenchida depois de `carregarSessao()` confirmar o
 * token com a API — token guardado não é o mesmo que sessão válida.
 */
let sessao: SessaoAtual | null = null

/** Requisição de sessão ainda não resolvida, para não duplicar chamadas. */
let emVoo: Promise<SessaoAtual | null> | null = null

function lerToken(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_TOKEN)
  } catch {
    // Navegador com storage bloqueado: a sessão vale só enquanto a aba viver.
    return null
  }
}

function gravarToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(CHAVE_TOKEN, token)
    else window.localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    /* sem persistência; o token em memória continua valendo */
  }
}

// Restaura o token assim que o módulo carrega, antes de qualquer requisição.
definirToken(lerToken())

export const AuthService = {
  /** Há token guardado. Não garante que ainda seja válido. */
  temToken(): boolean {
    return lerToken() !== null
  },

  sessaoAtual(): SessaoAtual | null {
    return sessao
  },

  async entrar(email: string, senha: string): Promise<SessaoAtual> {
    const { token } = await requisitar<{ token: string }>('/auth/login', {
      metodo: 'POST',
      corpo: { email, senha },
    })

    gravarToken(token)
    definirToken(token)

    const atual = await requisitar<SessaoAtual>('/auth/eu')
    sessao = atual
    return atual
  },

  /**
   * Confirma o token com a API e preenche a sessão.
   * Devolve `null` quando o token não vale mais — aí a rota protegida manda
   * para o login. Erro de rede **não** desloga: derrubar a sessão porque a API
   * piscou seria pior que mostrar a falha.
   */
  async carregarSessao(): Promise<SessaoAtual | null> {
    if (sessao) return sessao
    if (!lerToken()) return null

    // Reaproveita a requisição em voo: dois componentes pedindo a sessão ao
    // mesmo tempo (ou o StrictMode montando duas vezes) não devem virar duas
    // chamadas à API.
    emVoo ??= requisitar<SessaoAtual>('/auth/eu')
      .then((s) => {
        sessao = s
        return s
      })
      .catch((erro: unknown) => {
        if (erro instanceof ErroApi && erro.naoAutorizado) {
          AuthService.sair()
          return null
        }
        throw erro
      })
      .finally(() => {
        emVoo = null
      })

    return emVoo
  },

  /** Busca a sessão de novo — as lojas mudaram e o seletor precisa saber. */
  async recarregarSessao(): Promise<SessaoAtual | null> {
    if (!lerToken()) return null
    sessao = await requisitar<SessaoAtual>('/auth/eu')
    return sessao
  },

  sair(): void {
    sessao = null
    emVoo = null
    gravarToken(null)
    definirToken(null)
  },
}
