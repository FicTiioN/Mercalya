import { AuthService } from './auth.service'

/**
 * Sessão da aplicação e a **loja em contexto**.
 *
 * A empresa tem N lojas; quase toda tela opera sobre uma delas. A escolha fica
 * no `localStorage` — é preferência do **dispositivo**, não dado da conta: o
 * totem da loja B precisa acordar na loja B mesmo entrando com o mesmo login
 * que o escritório usa na loja A. A chave leva o id da empresa para uma
 * escolha não vazar entre contas no mesmo navegador.
 *
 * A escolha é sempre validada contra as lojas **ativas** da sessão: loja
 * desativada ou de outra empresa cai para a primeira. Nunca há loja em uso que
 * não exista.
 */
const ouvintes = new Set<() => void>()

function chaveEscolha(): string | null {
  const empresaId = AuthService.sessaoAtual()?.empresa.id
  return empresaId ? `mercalya:loja:${empresaId}` : null
}

function lerEscolha(): string | null {
  try {
    const chave = chaveEscolha()
    return chave ? window.localStorage.getItem(chave) : null
  } catch {
    return null
  }
}

function gravarEscolha(lojaId: string): void {
  try {
    const chave = chaveEscolha()
    if (chave) window.localStorage.setItem(chave, lojaId)
  } catch {
    /* sem persistência: a escolha vale só enquanto a aba viver */
  }
}

function notificar(): void {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export const AppSession = {
  usuarioAtual() {
    const sessao = AuthService.sessaoAtual()
    return sessao?.usuario ?? { nome: '', iniciais: '', funcao: '', email: '' }
  },

  empresaAtual(): string | null {
    return AuthService.sessaoAtual()?.empresa.nome ?? null
  },

  /** Lojas ativas da empresa, marcando a que está em contexto. */
  lojasDisponiveis(): Array<{ id: string; nome: string; condominio: string; ativa: boolean }> {
    const atual = AppSession.lojaAtualId()
    return (AuthService.sessaoAtual()?.lojas ?? []).map((loja) => ({
      id: loja.id,
      nome: loja.nome,
      condominio: loja.condominio,
      ativa: loja.id === atual,
    }))
  },

  lojaAtualId(): string {
    const lojas = AuthService.sessaoAtual()?.lojas ?? []
    const escolhida = lerEscolha()
    if (escolhida && lojas.some((l) => l.id === escolhida)) return escolhida
    return lojas[0]?.id ?? ''
  },

  lojaAtual(): string {
    const id = AppSession.lojaAtualId()
    return AuthService.sessaoAtual()?.lojas.find((l) => l.id === id)?.nome ?? ''
  },

  condominioAtual(): string {
    const id = AppSession.lojaAtualId()
    return AuthService.sessaoAtual()?.lojas.find((l) => l.id === id)?.condominio ?? ''
  },

  /** Troca a loja em contexto. Quem assinou (`assinar`) é avisado e recarrega. */
  selecionarLoja(lojaId: string): void {
    const lojas = AuthService.sessaoAtual()?.lojas ?? []
    if (!lojas.some((l) => l.id === lojaId)) return
    gravarEscolha(lojaId)
    notificar()
  },

  /** Depois de criar, renomear ou desativar uma loja: a sessão traz a lista nova. */
  async recarregarLojas(): Promise<void> {
    await AuthService.recarregarSessao()
    notificar()
  },

  /** Para `useSyncExternalStore`: avisa quando a loja em contexto (ou a lista) muda. */
  assinar(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
  },
}
