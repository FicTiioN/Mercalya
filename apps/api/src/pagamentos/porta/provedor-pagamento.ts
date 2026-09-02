/**
 * A porta de pagamento: o que o Mercalya precisa de **qualquer** maquininha.
 *
 * O vocabulário é nosso, não o de um adquirente. Um adaptador traduz de e
 * para o provedor real; o resto do sistema fala só esta interface. É o que
 * permite trocar Mercado Pago por TEF sem tocar em venda, estoque ou totem.
 *
 * O que não cabe aqui de propósito: parcelamento com juros de quem, janela de
 * estorno, Pix no visor ou na tela — isso vaza de provedor para provedor e
 * fica dentro de cada adaptador, exposto pelo `retornoBruto` quando importa.
 */

export type FormaNoProvedor = 'cartao-credito' | 'cartao-debito' | 'pix'

export type StatusNoProvedor =
  | 'pendente'
  | 'aprovado'
  | 'recusado'
  | 'cancelado'
  | 'expirado'
  | 'estornado'

export interface PedidoPagamento {
  /** Repetir a chave não cobra duas vezes — o provedor devolve a mesma intenção. */
  chaveIdempotencia: string
  /** Nossa referência (o id do pagamento). Volta em todo retorno do provedor. */
  referenciaInterna: string
  valor: number
  forma: FormaNoProvedor
  parcelas: number
  /** Aparece no visor da maquininha e no extrato. */
  descricao: string
}

export interface IntencaoPagamento {
  /** Id do pagamento **no provedor** — é o que a conciliação consulta. */
  referenciaExterna: string
  status: StatusNoProvedor
  bruto: unknown
}

export interface SituacaoPagamento {
  status: StatusNoProvedor
  autorizacao?: string
  nsu?: string
  bandeira?: string
  ultimosDigitos?: string
  motivoRecusa?: string
  /** Retorno do provedor como veio. Na contestação, é isto que vale. */
  bruto: unknown
}

export interface ResultadoEstorno {
  referenciaEstorno: string
  bruto: unknown
}

export interface ProvedorPagamento {
  readonly nome: string

  /** Cria a intenção e acorda a maquininha. Normalmente volta `pendente`. */
  iniciar(pedido: PedidoPagamento): Promise<IntencaoPagamento>

  /** Estado atual no provedor. Idempotente — pode ser chamado quantas vezes for preciso. */
  consultar(referenciaExterna: string): Promise<SituacaoPagamento>

  /**
   * Cancela uma intenção ainda pendente (o cliente desistiu). Se o provedor
   * responder que já aprovou, devolve `aprovado` — quem chama decide estornar.
   */
  abortar(referenciaExterna: string): Promise<SituacaoPagamento>

  /** Devolve o dinheiro de um pagamento aprovado. */
  estornar(referenciaExterna: string, valor: number): Promise<ResultadoEstorno>
}

/** Operador registrou o recebimento à mão — não passou por provedor nenhum. */
export const PROVEDOR_MANUAL = 'manual'
