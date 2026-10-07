import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { FormaPagamentoVenda, Prisma, StatusPagamento } from '@prisma/client'
import type { Transacao } from '../estoque/nucleo.service'
import { numero } from '../comum/numero'
import { ProvedoresPagamento } from './porta/provedores.service'
import {
  PROVEDOR_MANUAL,
  type FormaNoProvedor,
  type IntencaoPagamento,
  type ResultadoEstorno,
  type SituacaoPagamento,
  type StatusNoProvedor,
} from './porta/provedor-pagamento'

/** O que o serviço precisa saber de um pagamento para falar com o provedor. */
export interface PagamentoNoProvedor {
  id: string
  empresaId: string
  provedor: string
  referenciaExterna: string | null
  chaveIdempotencia: string | null
  forma: FormaPagamentoVenda
  valor: Prisma.Decimal | number
  parcelas: number
}

const STATUS_DO_PROVEDOR: Record<StatusNoProvedor, StatusPagamento> = {
  pendente: StatusPagamento.PENDENTE,
  aprovado: StatusPagamento.APROVADO,
  recusado: StatusPagamento.RECUSADO,
  cancelado: StatusPagamento.CANCELADO,
  expirado: StatusPagamento.EXPIRADO,
  estornado: StatusPagamento.ESTORNADO,
}

/**
 * Fala com o provedor e traduz a resposta para a linha de `pagamento`.
 *
 * Não conhece venda nem estoque — de propósito. As chamadas ao provedor são
 * **rede**, e rede não entra em transação: quem chama faz a chamada fora,
 * e depois grava o resultado dentro, com `aplicarSituacao`.
 */
@Injectable()
export class PagamentosService {
  private readonly logger = new Logger(PagamentosService.name)

  constructor(private readonly provedores: ProvedoresPagamento) {}

  iniciar(pagamento: PagamentoNoProvedor, descricao: string): Promise<IntencaoPagamento> {
    const provedor = this.provedores.obter(pagamento.empresaId, pagamento.provedor)
    return provedor.iniciar({
      // Sem chave do PDV, o próprio id serve: reenviar o mesmo pagamento não
      // abre duas ordens no provedor.
      chaveIdempotencia: pagamento.chaveIdempotencia ?? pagamento.id,
      referenciaInterna: pagamento.id,
      valor: numero(pagamento.valor),
      forma: this.formaNoProvedor(pagamento.forma),
      parcelas: pagamento.parcelas,
      descricao,
    })
  }

  consultar(pagamento: PagamentoNoProvedor): Promise<SituacaoPagamento> {
    return this.provedores
      .obter(pagamento.empresaId, pagamento.provedor)
      .consultar(this.referencia(pagamento))
  }

  abortar(pagamento: PagamentoNoProvedor): Promise<SituacaoPagamento> {
    return this.provedores
      .obter(pagamento.empresaId, pagamento.provedor)
      .abortar(this.referencia(pagamento))
  }

  async estornar(pagamento: PagamentoNoProvedor): Promise<ResultadoEstorno> {
    try {
      return await this.provedores
        .obter(pagamento.empresaId, pagamento.provedor)
        .estornar(this.referencia(pagamento), numero(pagamento.valor))
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro)
      this.logger.error(`Estorno do pagamento ${pagamento.id} falhou no provedor: ${motivo}`)
      throw new ConflictException(`Não foi possível estornar o pagamento no provedor: ${motivo}`)
    }
  }

  /**
   * Grava a situação vinda do provedor **só se o pagamento ainda está
   * pendente** — um compare-and-set. Dois pollers sincronizando ao mesmo
   * tempo não aplicam a aprovação duas vezes: o segundo espera o lock da
   * linha, reavalia o `where` e não encontra mais `PENDENTE`.
   *
   * Devolve se foi esta chamada que aplicou.
   */
  async aplicarSituacao(
    tx: Transacao,
    pagamentoId: string,
    situacao: SituacaoPagamento,
  ): Promise<boolean> {
    const r = await tx.pagamento.updateMany({
      where: { id: pagamentoId, status: StatusPagamento.PENDENTE },
      data: this.dadosDaSituacao(situacao),
    })
    return r.count === 1
  }

  /** Campos de `pagamento` que uma situação do provedor preenche. */
  dadosDaSituacao(situacao: SituacaoPagamento): Prisma.PagamentoUpdateManyMutationInput {
    const status = STATUS_DO_PROVEDOR[situacao.status]
    return {
      status,
      autorizacao: situacao.autorizacao ?? '',
      nsu: situacao.nsu ?? '',
      bandeira: situacao.bandeira ?? '',
      ultimosDigitos: situacao.ultimosDigitos ?? '',
      motivoRecusa: situacao.motivoRecusa ?? '',
      retornoBruto: situacao.bruto as Prisma.InputJsonValue,
      confirmadoEm: status === StatusPagamento.PENDENTE ? null : new Date(),
    }
  }

  usaProvedor(pagamento: { provedor: string }): boolean {
    return pagamento.provedor !== PROVEDOR_MANUAL
  }

  /* ---------------------------------------------------------------- */

  private referencia(pagamento: PagamentoNoProvedor): string {
    if (!pagamento.referenciaExterna) {
      throw new ConflictException('Pagamento ainda não foi enviado ao provedor.')
    }
    return pagamento.referenciaExterna
  }

  private formaNoProvedor(forma: FormaPagamentoVenda): FormaNoProvedor {
    switch (forma) {
      case FormaPagamentoVenda.CARTAO_CREDITO:
        return 'cartao-credito'
      case FormaPagamentoVenda.CARTAO_DEBITO:
        return 'cartao-debito'
      case FormaPagamentoVenda.PIX:
        return 'pix'
      default:
        throw new ConflictException('Dinheiro não passa pela maquininha.')
    }
  }
}
