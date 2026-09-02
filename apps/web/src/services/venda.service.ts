import type {
  ConsultaBase,
  EventoVenda,
  FormaPagamentoVenda,
  ID,
  NovaVenda,
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
 * Vendas.
 *
 * `registrar` é a única saída de estoque por venda: a API congela os preços
 * da loja, grava os pagamentos e debita a prateleira por FEFO em uma
 * transação só. O preço **não** é enviado — vem da configuração da loja.
 *
 * Os deltas do resumo comparam o período consultado com o **imediatamente
 * anterior de mesma duração** — é medição, não a estimativa fixa que o mock
 * devolvia.
 */
export const VendaService = {
  /**
   * Registra uma venda já paga. Reenviar com a mesma `chaveIdempotencia`
   * devolve a mesma venda com `repetida: true` — sem segunda baixa.
   */
  async registrar(nova: NovaVenda): Promise<{ venda: VendaListItem; repetida: boolean }> {
    return chamarApi('/vendas', { metodo: 'POST', corpo: nova })
  },

  /** Devolve a mercadoria à prateleira nos mesmos lotes e estorna os pagamentos. */
  async cancelar(id: ID, motivo?: string): Promise<VendaListItem> {
    return chamarApi(`/vendas/${id}/cancelar`, { metodo: 'POST', corpo: { motivo } })
  },

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
