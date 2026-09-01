import type {
  ConsultaBase,
  EventoVenda,
  FormaPagamentoVenda,
  ID,
  Paginado,
  StatusVenda,
  VendaListItem,
} from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface ConsultaVendas extends ConsultaBase {
  de?: string
  ate?: string
  lojaId?: string
  formaPagamento?: FormaPagamentoVenda | 'todas'
  status?: StatusVenda | 'todos'
}

export interface ResumoVendas {
  totalVendas: number
  faturamentoBruto: number
  ticketMedio: number
  itensVendidos: number
  canceladas: number
  /**
   * Comparam com o período imediatamente anterior de mesma duração. Vêm
   * **ausentes** quando não há período anterior com vendas — o card omite a
   * linha em vez de afirmar "0,0%".
   */
  totalVendasDelta?: number
  faturamentoDelta?: number
  ticketMedioDelta?: number
  itensVendidosDelta?: number
  canceladasDelta?: number
}

export const ROTULOS_PAGAMENTO: Record<FormaPagamentoVenda, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  'cartao-debito': 'Cartão de débito',
  'cartao-credito': 'Cartão de crédito',
}

/**
 * Vendas — somente leitura nesta fase.
 *
 * O histórico veio do seed **já debitando estoque**: cada venda concluída
 * gerou movimentação `VENDA` e reduziu a prateleira, em ordem cronológica.
 * Por isso entradas − perdas − vendas fecha com o saldo atual.
 *
 * Os deltas do resumo comparam o período consultado com o **imediatamente
 * anterior de mesma duração** — é medição, não a estimativa fixa que o mock
 * devolvia.
 */
export const VendaService = {
  async listar(consulta: ConsultaVendas = {}): Promise<Paginado<VendaListItem>> {
    return chamarApi(`/vendas${montarQuery({ ...consulta })}`)
  },

  async resumo(consulta: ConsultaVendas = {}): Promise<ResumoVendas> {
    return chamarApi(`/vendas/resumo${montarQuery({ ...consulta })}`)
  },

  async obter(id: ID): Promise<VendaListItem> {
    return chamarApi(`/vendas/${id}`)
  },

  /** Linha do tempo da venda, derivada do próprio registro. */
  async historico(id: ID): Promise<EventoVenda[]> {
    return chamarApi(`/vendas/${id}/historico`)
  },

  async lojas(): Promise<Array<{ id: string; nome: string }>> {
    return chamarApi('/vendas/lojas')
  },
}
