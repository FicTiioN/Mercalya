/**
 * Modelos de domínio do Mercalya.
 * Nenhum `any`. Estes tipos são o contrato que os Services devolvem hoje a partir
 * dos mocks e amanhã a partir da API real.
 */

export type ID = string

export type UnidadeMedida = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'cx' | 'pct' | 'fd'

export type StatusProduto = 'ativo' | 'inativo'

export type ControleValidade = 'nao-controlar' | 'por-lote' | 'obrigatorio'

export interface Categoria {
  id: ID
  nome: string
  cor: string
  emoji: string
}

export interface Marca {
  id: ID
  nome: string
}

/**
 * Catálogo: o que o produto **é**. Nada aqui varia entre lojas.
 *
 * Preço de venda e níveis de reposição da loja NÃO moram aqui — são decisões
 * comerciais de cada ponto de venda e vivem em `ConfiguracaoProdutoLoja`.
 */
export interface Produto {
  id: ID
  nome: string
  ean: string
  sku: string
  categoriaId: ID
  marcaId: ID | null
  unidade: UnidadeMedida
  conteudo: string
  /** Referência usada como padrão ao vincular o produto a uma nova loja. */
  precoSugerido: number
  /** Calculado a partir das compras. `null` enquanto não houver entrada. */
  custoMedio: number | null
  /** Saldo no estoque central que dispara uma nova compra ao fornecedor. */
  pontoCompra: number
  /** Teto de estoque no central, usado para dimensionar a compra. */
  estoqueMaximoCentral: number
  controleValidade: ControleValidade
  validadePadraoDias: number | null
  /** Endereçamento dentro do estoque central (ex.: "Corredor A - Prateleira 01"). */
  localizacaoPadrao: string
  fornecedorPrincipalId: ID | null
  observacoes: string
  imagem: string
  status: StatusProduto
  criadoEm: string
  /** Data da última venda — usada para o indicador "sem giro". */
  ultimaVendaEm: string | null
}

/**
 * Configuração comercial de um produto **em uma loja específica**.
 *
 * É aqui que mora o preço de venda: o mesmo produto pode custar valores
 * diferentes em lojas diferentes. Também guarda os níveis de reposição da
 * prateleira, que são outra pergunta que não a do ponto de compra do central.
 */
export interface ConfiguracaoProdutoLoja {
  id: ID
  produtoId: ID
  lojaId: ID
  precoVenda: number
  /** Abaixo disto a loja precisa ser reabastecida. */
  estoqueMinimo: number
  /** Alvo ao repor a prateleira. */
  estoqueIdeal: number
  /** Se `false`, a loja não vende este produto. */
  ativo: boolean
}

export type StatusFornecedor = 'ativo' | 'inativo'

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface Fornecedor {
  id: ID
  nome: string
  nomeFantasia: string
  documento: string
  categoriaPrincipalId: ID
  contato: {
    nome: string
    cargo: string
    telefone: string
    whatsapp: string
    email: string
  }
  endereco: Endereco
  comercial: {
    prazoEntregaDias: number
    condicaoPagamento: string
    descontoPadrao: number
  }
  observacoes: string
  status: StatusFornecedor
  criadoEm: string
}

export type StatusCompra = 'rascunho' | 'confirmada' | 'cancelada'

export type FormaPagamento = 'boleto' | 'pix' | 'dinheiro' | 'cartao' | 'prazo'

export interface ItemCompra {
  id: ID
  produtoId: ID
  quantidade: number
  unidade: UnidadeMedida
  custoUnitario: number
  validade: string | null
  lote: string
  total: number
}

export interface Compra {
  id: ID
  numero: string
  fornecedorId: ID
  notaFiscal: string
  dataEmissao: string
  dataEntrada: string
  condicaoPagamento: string
  formaPagamento: FormaPagamento
  dataVencimento: string
  observacoes: string
  itens: ItemCompra[]
  frete: number
  desconto: number
  subtotal: number
  total: number
  localDestinoId: ID
  status: StatusCompra
  criadoEm: string
}

export interface Lote {
  id: ID
  codigo: string
  produtoId: ID
  compraId: ID | null
  custoUnitario: number
  validade: string | null
  criadoEm: string
}

export type TipoLocal = 'central' | 'loja'

export interface LocalEstoque {
  id: ID
  nome: string
  tipo: TipoLocal
  descricao: string
  lojaId: ID | null
}

/** Saldo de um produto/lote em um local. É a unidade atômica do estoque. */
export interface SaldoEstoque {
  id: ID
  produtoId: ID
  loteId: ID | null
  localId: ID
  quantidade: number
  reservado: number
  atualizadoEm: string
}

export type TipoMovimentacao =
  | 'ENTRADA'
  | 'TRANSFERENCIA'
  | 'VENDA'
  | 'PERDA'
  | 'AJUSTE'
  | 'DEVOLUCAO'

export interface MovimentacaoEstoque {
  id: ID
  tipo: TipoMovimentacao
  produtoId: ID
  loteId: ID | null
  quantidade: number
  origemId: ID | null
  origemLabel: string
  destinoId: ID | null
  destinoLabel: string
  usuario: string
  observacao: string
  documento: string
  custoUnitario: number | null
  valorTotal: number | null
  data: string
  status: 'concluida' | 'cancelada'
}

export interface ItemAbastecimento {
  id: ID
  produtoId: ID
  loteId: ID | null
  quantidade: number
}

export interface Abastecimento {
  id: ID
  numero: string
  origemId: ID
  destinoId: ID
  itens: ItemAbastecimento[]
  totalProdutos: number
  totalItens: number
  status: 'concluido' | 'cancelado'
  usuario: string
  data: string
}

export type MotivoPerda =
  | 'vencimento'
  | 'quebra'
  | 'avaria'
  | 'roubo'
  | 'erro-operacional'
  | 'outros'

export interface PerdaEstoque {
  id: ID
  produtoId: ID
  loteId: ID | null
  localId: ID
  motivo: MotivoPerda
  quantidade: number
  valor: number
  observacao: string
  registradoPor: string
  data: string
}

export interface Loja {
  id: ID
  nome: string
  condominio: string
  localId: ID
}

export interface Usuario {
  id: ID
  nome: string
  iniciais: string
  funcao: string
  email: string
}

/* ------------------------------------------------------------------ */
/* Agregados de leitura (view models devolvidos pelos Services)        */
/* ------------------------------------------------------------------ */

export interface ProdutoListItem extends Produto {
  categoriaNome: string
  marcaNome: string | null
  estoqueTotal: number
  estoqueCentral: number
  estoqueLoja: number
  semGiro: boolean
  /** Estoque central abaixo do ponto de compra. */
  estoqueBaixo: boolean
  /** Preço na loja em contexto. `null` quando o produto não é vendido nela. */
  precoNaLoja: number | null
  /** `true` quando as lojas praticam preços diferentes para este produto. */
  precosVariam: boolean
  /** Em quantas lojas o produto está ativo. */
  lojasAtivas: number
}

export interface FornecedorListItem extends Fornecedor {
  categoriaNome: string
  totalProdutos: number
  totalCompras: number
  valorCompras12m: number
  ultimaCompra: string | null
}

export interface LoteEstoqueItem {
  saldoId: ID
  produtoId: ID
  produtoNome: string
  produtoImagem: string
  ean: string
  categoriaNome: string
  loteCodigo: string
  validade: string | null
  diasParaVencer: number | null
  quantidade: number
  reservado: number
  disponivel: number
  custoMedio: number
  valorTotal: number
  localId: ID
  localNome: string
  posicao: string
  status: 'disponivel' | 'atencao' | 'critico'
}

/** Um produto na loja. O que importa é se está disponível para venda. */
export interface ItemLojaView {
  produtoId: ID
  produtoNome: string
  produtoImagem: string
  categoriaNome: string
  quantidade: number
  precoVenda: number
  /** Mínimo configurado para esta loja. */
  estoqueMinimo: number
  ultimaReposicao: string | null
  status: 'disponivel' | 'estoque-baixo' | 'indisponivel'
  /** `false` quando a loja deixou de vender o produto. */
  ativo: boolean
}

export interface SugestaoAbastecimento {
  produtoId: ID
  produtoNome: string
  produtoImagem: string
  quantidadeSugerida: number
  disponivelCentral: number
  motivo: string
  valorEstimado: number
}

export type EstadoEtapa = 'concluido' | 'em-andamento' | 'pendente'

export interface EtapaInicio {
  ordem: number
  chave: string
  icone: string
  titulo: string
  descricao: string
  estado: EstadoEtapa
  metrica: string
  metricaLabel: string
  ctaLabel: string
  ctaRota: string
  ctaVariante: 'primary' | 'outline' | 'amber'
}

export interface Atividade {
  id: ID
  tipo: TipoMovimentacao | 'CADASTRO'
  titulo: string
  descricao: string
  quando: string
  usuario: string
  iniciais: string
}

export type SeveridadeAlerta = 'critico' | 'atencao' | 'info' | 'sucesso'

export interface Alerta {
  id: ID
  severidade: SeveridadeAlerta
  titulo: string
  descricao: string
  quantidade: number | null
  rota: string
}

export interface ResumoInicio {
  etapas: EtapaInicio[]
  progresso: number
  etapasConcluidas: number
  totalEtapas: number
  indicadores: {
    produtosCadastrados: number
    produtosDelta?: number
    fornecedoresAtivos: number
    fornecedoresNovosMes: number
    comprasSemana: number
    comprasDelta?: number
    itensNaLoja: number
    percentualDoCentral: number
  }
  atividades: Atividade[]
  sugestoes: Alerta[]
}

export interface PontoSerie {
  label: string
  valor: number
  comparativo?: number
}

export interface FatiaCategoria {
  categoriaId: ID
  nome: string
  valor: number
  percentual: number
  cor: string
}

export interface DashboardGerencial {
  /**
   * As variações são **opcionais de propósito**: sem período anterior para
   * comparar, o card omite a linha em vez de afirmar "0,0%".
   */
  kpis: {
    vendas: number
    vendasDelta?: number
    lucro: number
    lucroDelta?: number
    ticketMedio: number
    ticketMedioDelta?: number
    margem: number
    /** Em pontos percentuais — margem já é um percentual. */
    margemDelta?: number
    valorEstoque: number
    valorEstoqueDelta?: number
    itensLoja: number
    itensLojaDelta?: number
    compras: number
    comprasDelta?: number
    perdas: number
    perdasDelta?: number
  }
  evolucaoVendas: PontoSerie[]
  comprasXVendas: PontoSerie[]
  distribuicaoCategoria: FatiaCategoria[]
  estoqueBaixo: Array<{
    produtoId: ID
    nome: string
    estoque: number
    minimo: number
  }>
  proximosVencimentos: Array<{
    produtoId: ID
    nome: string
    validade: string
    dias: number
  }>
  topVendidos: Array<{
    produtoId: ID
    nome: string
    imagem: string
    quantidade: number
    receita: number
  }>
  semGiro: Array<{
    produtoId: ID
    nome: string
    ultimaVenda: string | null
    estoque: number
    valor: number
  }>
  alertas: Alerta[]
  resumoOperacional: {
    vendasHoje: number
    /** Ausente enquanto nao houver meta cadastrada — a tela nao desenha a barra. */
    metaVendas?: number
    clientesAtendidos: number
    ticketMedioHoje: number
    produtosVendidos: number
    produtosVendidosDelta?: number
    devolucoes: number
    percentualDevolucoes: number
  }
}

/* ------------------------------------------------------------------ */
/* Utilitários de consulta                                             */
/* ------------------------------------------------------------------ */

export interface Paginado<T> {
  itens: T[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

export interface ConsultaBase {
  busca?: string
  pagina?: number
  porPagina?: number
}

/* ------------------------------------------------------------------ */
/* Notificações                                                        */
/* ------------------------------------------------------------------ */

export type TipoNotificacao =
  | 'estoque'
  | 'validade'
  | 'abastecimento'
  | 'compra'
  | 'perda'
  | 'sistema'

export interface Notificacao {
  id: ID
  tipo: TipoNotificacao
  severidade: SeveridadeAlerta
  titulo: string
  descricao: string
  /** ISO. Deriva do fato que originou a notificação. */
  quando: string
  /** Para onde a notificação leva ao ser clicada. */
  rota: string
  lida: boolean
}

/* ------------------------------------------------------------------ */
/* Vendas                                                              */
/* ------------------------------------------------------------------ */

export type StatusVenda = 'concluida' | 'cancelada'

export type FormaPagamentoVenda = 'pix' | 'dinheiro' | 'cartao-debito' | 'cartao-credito'

export type StatusPagamento = 'aprovado' | 'pendente' | 'recusado'

export interface ItemVenda {
  id: ID
  produtoId: ID
  /** Nome e preço são congelados no momento da venda. */
  produtoNome: string
  ean: string
  imagem: string
  quantidade: number
  precoUnitario: number
  total: number
}

export interface PagamentoVenda {
  forma: FormaPagamentoVenda
  valorPago: number
  status: StatusPagamento
  quando: string
}

export interface Venda {
  id: ID
  numero: string
  lojaId: ID
  data: string
  clienteNome: string
  operador: string
  itens: ItemVenda[]
  subtotal: number
  desconto: number
  acrescimo: number
  total: number
  pagamento: PagamentoVenda
  troco: number
  tipoVenda: string
  canal: string
  observacao: string
  status: StatusVenda
  registradoEm: string
  atualizadoEm: string
  idInterno: string
}

export interface VendaListItem extends Venda {
  lojaNome: string
  totalItens: number
}

export interface EventoVenda {
  icone: 'venda' | 'pagamento' | 'comprovante' | 'cancelamento'
  titulo: string
  descricao: string
  quando: string
  autor: string
}
