import { AuthService } from './auth.service'

export { ErroDeNegocio } from './api'
export { ErroApi } from './http'
export { AuthService } from './auth.service'
export { CatalogoService } from './catalogo.service'
export type { CategoriaComUso, EntradaCategoria, MarcaComUso } from './catalogo.service'
export type { SessaoAtual, UsuarioSessao } from './auth.service'
export { ProdutoService } from './produto.service'
export type {
  ConfiguracaoLojaView,
  ConsultaProdutos,
  EntradaConfiguracaoLoja,
  EntradaProduto,
  ResumoProdutos,
} from './produto.service'
export { FornecedorService } from './fornecedor.service'
export type {
  CompraResumida,
  ConsultaFornecedores,
  EntradaFornecedor,
  ProdutoFornecido,
  ResumoFornecedores,
} from './fornecedor.service'
export { CompraService } from './compra.service'
export type {
  CompraListItem,
  EntradaCompra,
  ItemCompraEntrada,
  ResultadoCompra,
} from './compra.service'
export { EstoqueService } from './estoque.service'
export type { ConsultaEstoque, ResumoEstoque, ResumoSugestoes } from './estoque.service'
export { AbastecimentoService } from './abastecimento.service'
export type {
  AbastecimentoListItem,
  ItemAbastecimentoEntrada,
  ProdutoDisponivel,
  ResultadoAbastecimento,
} from './abastecimento.service'
export { LojaService } from './loja.service'
export type { ConsultaLoja, ResumoLoja } from './loja.service'
export { MovimentacaoService } from './movimentacao.service'
export type {
  ConsultaMovimentacoes,
  EventoHistorico,
  MovimentacaoListItem,
  ResumoMovimentacoes,
} from './movimentacao.service'
export { MOTIVOS, PerdaService } from './perda.service'
export type {
  ConsultaPerdas,
  EntradaPerda,
  PerdaListItem,
  ProximoVencimento,
  ResumoPerdas,
  TopPerda,
} from './perda.service'
export { InicioService } from './inicio.service'
export type { Dica } from './inicio.service'
export { NotificacaoService } from './notificacao.service'
export type { ResumoNotificacoes } from './notificacao.service'
export { ROTULOS_PAGAMENTO, VendaService } from './venda.service'
export type { ConsultaVendas, ResumoVendas } from './venda.service'
export { PainelService } from './painel.service'
export type { FiltroPainel } from './painel.service'

/**
 * Sessão da aplicação.
 *
 * Lia um repositório em `localStorage`, que pertence ao **navegador** e não à
 * conta — por isso mostrava a loja de outra empresa no shell e em
 * Configurações. Agora tudo vem da sessão autenticada.
 *
 * Os componentes continuam sem tocar em armazenamento: quem persiste é o
 * AuthService.
 */
export const AppSession = {
  usuarioAtual() {
    const sessao = AuthService.sessaoAtual()
    return (
      sessao?.usuario ?? { nome: '', iniciais: '', funcao: '', email: '' }
    )
  },

  empresaAtual(): string | null {
    return AuthService.sessaoAtual()?.empresa.nome ?? null
  },

  /** Lojas às quais o usuário tem acesso, marcando a que está em contexto. */
  lojasDisponiveis(): Array<{ id: string; nome: string; condominio: string; ativa: boolean }> {
    const lojas = AuthService.sessaoAtual()?.lojas ?? []
    return lojas.map((loja, indice) => ({
      id: loja.id,
      nome: loja.nome,
      condominio: loja.condominio,
      // Sem seletor de loja ainda: a primeira é a que está em uso.
      ativa: indice === 0,
    }))
  },

  condominioAtual(): string {
    return AuthService.sessaoAtual()?.lojas[0]?.condominio ?? ''
  },

  lojaAtualId(): string {
    return AuthService.sessaoAtual()?.lojas[0]?.id ?? ''
  },

  lojaAtual(): string {
    return AuthService.sessaoAtual()?.lojas[0]?.nome ?? ''
  },
}
