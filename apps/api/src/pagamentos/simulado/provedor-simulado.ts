import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type {
  IntencaoPagamento,
  PedidoPagamento,
  ProvedorPagamento,
  ResultadoEstorno,
  SituacaoPagamento,
  StatusNoProvedor,
} from '../porta/provedor-pagamento'

type Desfecho = 'aprovado' | 'recusado'

interface OrdemSimulada {
  id: string
  pedido: PedidoPagamento
  criadoEm: number
  status: StatusNoProvedor
  /** Definido pelo endpoint de controle — o "aproximar o cartão" do simulador. */
  desfechoForcado: Desfecho | null
  autorizacao: string
  nsu: string
  bandeira: string
  ultimosDigitos: string
  motivoRecusa: string
}

/** Vocabulário da Orders API do Mercado Pago Point, para o `bruto` ter a cara do real. */
const STATUS_MP: Record<StatusNoProvedor, string> = {
  pendente: 'at_terminal',
  aprovado: 'processed',
  recusado: 'failed',
  cancelado: 'canceled',
  expirado: 'expired',
  estornado: 'refunded',
}

/**
 * Uma maquininha que não existe.
 *
 * Comporta-se como um terminal de verdade: a intenção nasce pendente e fica
 * assim até o cliente "aproximar o cartão" — o endpoint de controle — ou até
 * um atraso configurável, quando decide sozinha. Os centavos do valor mandam
 * no desfecho automático, como os cartões de teste dos gateways:
 *
 *   .99  recusado pelo emissor
 *   .98  nunca responde (o cliente foi embora — é a conciliação que resolve)
 *   resto aprovado
 *
 * O estado vive em memória de propósito: reiniciar a API "perde" as
 * intenções, e consultar uma referência desconhecida devolve `expirado` — o
 * mesmo que um provedor real faz com uma ordem que não reconhece. A
 * conciliação precisa lidar com isso, então o simulador não esconde.
 *
 * O `bruto` segue o formato da Orders API do Mercado Pago Point, para o
 * adaptador real substituir este sem o resto do sistema notar diferença.
 */
@Injectable()
export class ProvedorSimulado implements ProvedorPagamento {
  readonly nome = 'simulado'

  private atrasoMs = Number(process.env.PAGAMENTO_SIMULADO_ATRASO_MS ?? 3000)
  private readonly ordens = new Map<string, OrdemSimulada>()
  private readonly porChave = new Map<string, string>()

  /** Testes zeram o atraso para o terminal responder na primeira consulta. */
  configurar(opcoes: { atrasoMs?: number }): void {
    if (opcoes.atrasoMs !== undefined) this.atrasoMs = opcoes.atrasoMs
  }

  async iniciar(pedido: PedidoPagamento): Promise<IntencaoPagamento> {
    const repetida = this.porChave.get(pedido.chaveIdempotencia)
    if (repetida) {
      const ordem = this.ordens.get(repetida)!
      return { referenciaExterna: ordem.id, status: ordem.status, bruto: this.bruto(ordem) }
    }

    const ordem: OrdemSimulada = {
      id: `sim_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      pedido,
      criadoEm: Date.now(),
      status: 'pendente',
      desfechoForcado: null,
      autorizacao: '',
      nsu: '',
      bandeira: '',
      ultimosDigitos: '',
      motivoRecusa: '',
    }
    this.ordens.set(ordem.id, ordem)
    this.porChave.set(pedido.chaveIdempotencia, ordem.id)

    return { referenciaExterna: ordem.id, status: 'pendente', bruto: this.bruto(ordem) }
  }

  async consultar(referenciaExterna: string): Promise<SituacaoPagamento> {
    const ordem = this.ordens.get(referenciaExterna)
    if (!ordem) return this.desconhecida(referenciaExterna)

    if (ordem.status === 'pendente') this.resolver(ordem)
    return this.situacao(ordem)
  }

  async abortar(referenciaExterna: string): Promise<SituacaoPagamento> {
    const ordem = this.ordens.get(referenciaExterna)
    if (!ordem) return this.desconhecida(referenciaExterna)

    // Pode ter aprovado no exato instante: quem chama vê `aprovado` e estorna.
    if (ordem.status === 'pendente') this.resolver(ordem)
    if (ordem.status === 'pendente') ordem.status = 'cancelado'
    return this.situacao(ordem)
  }

  async estornar(referenciaExterna: string): Promise<ResultadoEstorno> {
    const ordem = this.ordens.get(referenciaExterna)
    if (!ordem) throw new Error(`Referência ${referenciaExterna} desconhecida no provedor.`)
    if (ordem.status !== 'aprovado') {
      throw new Error(`Só pagamento aprovado pode ser estornado (está ${ordem.status}).`)
    }
    ordem.status = 'estornado'
    return { referenciaEstorno: `${ordem.id}_ref`, bruto: this.bruto(ordem) }
  }

  /** Controle do terminal: o cliente aproximou o cartão (ou o emissor recusou). */
  forcar(referenciaExterna: string, desfecho: Desfecho): SituacaoPagamento {
    const ordem = this.ordens.get(referenciaExterna)
    if (!ordem) return this.desconhecida(referenciaExterna)
    if (ordem.status !== 'pendente') return this.situacao(ordem)

    ordem.desfechoForcado = desfecho
    this.resolver(ordem)
    return this.situacao(ordem)
  }

  /* ---------------------------------------------------------------- */

  private resolver(ordem: OrdemSimulada): void {
    const desfecho = ordem.desfechoForcado ?? this.desfechoAutomatico(ordem)
    if (!desfecho) return

    if (desfecho === 'recusado') {
      ordem.status = 'recusado'
      ordem.motivoRecusa = 'Cartão recusado pelo emissor.'
      return
    }

    const centavos = Math.round(ordem.pedido.valor * 100) % 100
    ordem.status = 'aprovado'
    ordem.autorizacao = String(100000 + Math.floor(Math.random() * 900000))
    ordem.nsu = String(Date.now()).slice(-9)
    ordem.bandeira =
      ordem.pedido.forma === 'pix' ? 'Pix' : centavos % 2 === 0 ? 'Visa' : 'Mastercard'
    ordem.ultimosDigitos = ordem.pedido.forma === 'pix' ? '' : '4242'
  }

  private desfechoAutomatico(ordem: OrdemSimulada): Desfecho | null {
    const centavos = Math.round(ordem.pedido.valor * 100) % 100
    if (centavos === 98) return null
    if (Date.now() - ordem.criadoEm < this.atrasoMs) return null
    return centavos === 99 ? 'recusado' : 'aprovado'
  }

  private situacao(ordem: OrdemSimulada): SituacaoPagamento {
    return {
      status: ordem.status,
      autorizacao: ordem.autorizacao,
      nsu: ordem.nsu,
      bandeira: ordem.bandeira,
      ultimosDigitos: ordem.ultimosDigitos,
      motivoRecusa: ordem.motivoRecusa,
      bruto: this.bruto(ordem),
    }
  }

  private desconhecida(referenciaExterna: string): SituacaoPagamento {
    return {
      status: 'expirado',
      motivoRecusa: 'Referência desconhecida no provedor.',
      bruto: { id: referenciaExterna, status: 'not_found', simulado: true },
    }
  }

  private bruto(o: OrdemSimulada) {
    const status = STATUS_MP[o.status]
    const aprovado = o.status === 'aprovado' || o.status === 'estornado'
    return {
      id: o.id,
      type: 'point',
      external_reference: o.pedido.referenciaInterna,
      status,
      status_detail:
        o.status === 'aprovado'
          ? 'accredited'
          : o.status === 'recusado'
            ? 'cc_rejected_other_reason'
            : status,
      total_amount: o.pedido.valor.toFixed(2),
      description: o.pedido.descricao,
      created_date: new Date(o.criadoEm).toISOString(),
      config: { point: { terminal_id: 'SIMULADO01', print_on_terminal: false } },
      transactions: {
        payments: [
          {
            id: `${o.id}_p1`,
            status,
            amount: o.pedido.valor.toFixed(2),
            payment_method: {
              id: o.bandeira ? o.bandeira.toLowerCase() : null,
              type:
                o.pedido.forma === 'pix'
                  ? 'bank_transfer'
                  : o.pedido.forma === 'cartao-debito'
                    ? 'debit_card'
                    : 'credit_card',
              installments: o.pedido.parcelas,
            },
            ...(aprovado
              ? {
                  authorization_code: o.autorizacao,
                  nsu: o.nsu,
                  card: o.ultimosDigitos ? { last_four_digits: o.ultimosDigitos } : undefined,
                }
              : {}),
            ...(o.status === 'recusado' ? { status_detail: 'cc_rejected_other_reason' } : {}),
          },
        ],
      },
      simulado: true,
    }
  }
}
