import type {
  Compra,
  ConsultaBase,
  FormaPagamento,
  ID,
  Paginado,
  UnidadeMedida,
} from '@/models'
import { chamarApi } from './chamada'

export interface ItemCompraEntrada {
  produtoId: ID
  quantidade: number
  unidade: UnidadeMedida
  custoUnitario: number
  validade: string | null
  lote: string
}

export interface EntradaCompra {
  fornecedorId: ID
  notaFiscal: string
  dataEmissao: string
  dataEntrada: string
  condicaoPagamento: string
  formaPagamento: FormaPagamento
  dataVencimento: string
  observacoes: string
  itens: ItemCompraEntrada[]
  frete: number
  desconto: number
  localDestinoId: ID
}

export interface CompraListItem extends Compra {
  fornecedorNome: string
  totalItens: number
}

export interface ResultadoCompra {
  compra: CompraListItem
  lotesCriados: number
  itensAdicionados: number
  produtosAfetados: string[]
}

/**
 * Compras. **Confirmar é a única entrada de estoque do sistema** — e agora
 * acontece dentro de uma transação no Postgres: lote, saldo, custo médio e
 * movimentação são gravados juntos ou nenhum é.
 */
export const CompraService = {
  async listar(consulta: ConsultaBase = {}): Promise<Paginado<CompraListItem>> {
    return chamarApi(`/compras${query(consulta)}`)
  },

  async obter(id: ID): Promise<CompraListItem> {
    return chamarApi(`/compras/${id}`)
  },

  async resumo(): Promise<{
    totalMes: number
    quantidadeMes: number
    ticketMedio: number
    ultimaCompra: string | null
  }> {
    return chamarApi('/compras/resumo')
  },

  async confirmar(entrada: EntradaCompra): Promise<ResultadoCompra> {
    return chamarApi('/compras/confirmar', { metodo: 'POST', corpo: entrada })
  },
}

function query(consulta: ConsultaBase): string {
  const params = new URLSearchParams()
  if (consulta.busca?.trim()) params.set('busca', consulta.busca.trim())
  if (consulta.pagina) params.set('pagina', String(consulta.pagina))
  if (consulta.porPagina) params.set('porPagina', String(consulta.porPagina))
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}
