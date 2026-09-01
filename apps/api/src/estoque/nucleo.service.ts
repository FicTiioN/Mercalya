import { Injectable } from '@nestjs/common'
import { Prisma, StatusMovimentacao, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'

/**
 * Núcleo do estoque: as primitivas que **movem mercadoria**.
 *
 * Toda função aqui recebe o cliente de transação (`tx`) como primeiro
 * parâmetro, nunca o Prisma global. Não é estilo: é o que garante que lote,
 * saldo, custo médio e movimentação sejam gravados no mesmo commit. Se uma
 * falhar, nenhuma vale — e o estoque nunca diverge do histórico.
 *
 * Aceitar `PrismaService` aqui seria abrir a porta para uma escrita fora da
 * transação, que é exatamente o defeito que o Postgres foi escolhido para
 * evitar.
 */
export type Transacao = Prisma.TransactionClient

@Injectable()
export class NucleoEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  /** Abre a transação. Timeout folgado: uma compra grande grava muitas linhas. */
  executar<T>(operacao: (tx: Transacao) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(operacao, { timeout: 20_000, maxWait: 10_000 })
  }

  /* ---------------------------------------------------------------- */
  /* Saldos                                                            */
  /* ---------------------------------------------------------------- */

  /** Soma o que existe de um produto em um local. */
  async totalNoLocal(tx: Transacao, produtoId: string, localId: string): Promise<number> {
    const r = await tx.saldoEstoque.aggregate({
      where: { produtoId, localId },
      _sum: { quantidade: true },
    })
    return numero(r._sum.quantidade)
  }

  /** Disponível = quantidade menos o reservado. */
  async disponivelNoLocal(tx: Transacao, produtoId: string, localId: string): Promise<number> {
    const saldos = await tx.saldoEstoque.findMany({
      where: { produtoId, localId },
      select: { quantidade: true, reservado: true },
    })
    return saldos.reduce(
      (acc, s) => acc + Math.max(0, numero(s.quantidade) - numero(s.reservado)),
      0,
    )
  }

  /**
   * Credita (ou debita, com `delta` negativo) o saldo de um lote em um local.
   *
   * O saldo nunca fica negativo — um estoque negativo silencioso contamina
   * custo médio, valor de estoque e sugestão de abastecimento de uma vez só.
   */
  async aplicarSaldo(
    tx: Transacao,
    params: {
      empresaId: string
      produtoId: string
      loteId: string | null
      localId: string
      delta: number
    },
  ): Promise<void> {
    const existente = await tx.saldoEstoque.findFirst({
      where: {
        produtoId: params.produtoId,
        loteId: params.loteId,
        localId: params.localId,
      },
    })

    if (existente) {
      const nova = Math.max(0, numero(existente.quantidade) + params.delta)
      await tx.saldoEstoque.update({
        where: { id: existente.id },
        data: { quantidade: nova },
      })
      return
    }

    await tx.saldoEstoque.create({
      data: {
        empresaId: params.empresaId,
        produtoId: params.produtoId,
        loteId: params.loteId,
        localId: params.localId,
        quantidade: Math.max(0, params.delta),
      },
    })
  }

  /**
   * Consome quantidade de um local seguindo **FEFO** — vence antes, sai antes.
   *
   * Devolve os lotes efetivamente consumidos, porque quem chama precisa deles:
   * a transferência recria o saldo lote a lote no destino, e a perda calcula o
   * valor pelo custo de cada lote.
   *
   * Saldo sem lote vai por último: lote com validade conhecida deve sair antes
   * de mercadoria sem rastreio.
   */
  async consumirFefo(
    tx: Transacao,
    params: { produtoId: string; localId: string; quantidade: number },
  ): Promise<Array<{ loteId: string | null; quantidade: number; custoUnitario: number }>> {
    const saldos = await tx.saldoEstoque.findMany({
      where: { produtoId: params.produtoId, localId: params.localId, quantidade: { gt: 0 } },
      include: { lote: true },
    })

    saldos.sort((a, b) => {
      const va = a.lote?.validade?.toISOString() ?? '9999-12-31'
      const vb = b.lote?.validade?.toISOString() ?? '9999-12-31'
      return va.localeCompare(vb)
    })

    const consumidos: Array<{
      loteId: string | null
      quantidade: number
      custoUnitario: number
    }> = []
    let restante = params.quantidade

    for (const saldo of saldos) {
      if (restante <= 0) break
      const disponivel = numero(saldo.quantidade)
      const usar = Math.min(disponivel, restante)
      if (usar <= 0) continue

      await tx.saldoEstoque.update({
        where: { id: saldo.id },
        data: { quantidade: disponivel - usar },
      })

      restante -= usar
      consumidos.push({
        loteId: saldo.loteId,
        quantidade: usar,
        custoUnitario: numero(saldo.lote?.custoUnitario),
      })
    }

    return consumidos
  }

  /* ---------------------------------------------------------------- */
  /* Custo médio                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Custo médio ponderado pelos lotes que **ainda têm saldo**.
   *
   * A conta é feita em `Decimal`, não em float: a divisão gera dízima, e
   * arredondar a cada compra acumula erro que aparece no valor do estoque.
   *
   * Sem saldo nenhum, mantém o custo da última entrada como referência — zerar
   * o custo faria a margem do próximo produto vendido parecer 100%.
   */
  async recalcularCusto(tx: Transacao, produtoId: string): Promise<void> {
    const lotes = await tx.lote.findMany({
      where: { produtoId },
      orderBy: { criadoEm: 'asc' },
      include: { saldos: { select: { quantidade: true } } },
    })
    if (lotes.length === 0) return

    let quantidade = new Prisma.Decimal(0)
    let valor = new Prisma.Decimal(0)

    for (const lote of lotes) {
      const qtd = lote.saldos.reduce(
        (acc, s) => acc.plus(s.quantidade),
        new Prisma.Decimal(0),
      )
      quantidade = quantidade.plus(qtd)
      valor = valor.plus(qtd.times(lote.custoUnitario))
    }

    const custo = quantidade.greaterThan(0)
      ? valor.dividedBy(quantidade).toDecimalPlaces(4)
      : lotes[lotes.length - 1].custoUnitario

    await tx.produto.update({ where: { id: produtoId }, data: { custoMedio: custo } })
  }

  /* ---------------------------------------------------------------- */
  /* Histórico e numeração                                             */
  /* ---------------------------------------------------------------- */

  async registrarMovimentacao(
    tx: Transacao,
    mov: {
      empresaId: string
      tipo: TipoMovimentacao
      produtoId: string
      loteId: string | null
      quantidade: number
      origemId: string | null
      origemLabel: string
      destinoId: string | null
      destinoLabel: string
      usuario: string
      observacao: string
      documento: string
      custoUnitario: number | null
      valorTotal: number | null
      data?: Date
    },
  ): Promise<void> {
    await tx.movimentacaoEstoque.create({
      data: {
        ...mov,
        data: mov.data ?? new Date(),
        status: StatusMovimentacao.CONCLUIDA,
      },
    })
  }

  /**
   * Próximo número de uma sequência da empresa (CP-1208, AB-1241...).
   *
   * O `increment` acontece no banco, dentro da transação: dois usuários
   * confirmando compras ao mesmo tempo não recebem o mesmo número, porque o
   * segundo espera o lock da linha.
   */
  async proximoNumero(
    tx: Transacao,
    empresaId: string,
    chave: string,
    prefixo: string,
    base: number,
  ): Promise<string> {
    const sequencia = await tx.sequencia.upsert({
      where: { empresaId_chave: { empresaId, chave } },
      create: { empresaId, chave, valor: base + 1 },
      update: { valor: { increment: 1 } },
    })
    return `${prefixo}-${sequencia.valor}`
  }

  /** Total geral da empresa — usado para provar que transferência não cria nem destrói. */
  async totalGlobal(tx: Transacao, empresaId: string): Promise<number> {
    const r = await tx.saldoEstoque.aggregate({
      where: { empresaId },
      _sum: { quantidade: true },
    })
    return numero(r._sum.quantidade)
  }

  /** Local do estoque central da empresa. */
  async localCentral(tx: Transacao, empresaId: string) {
    const local = await tx.localEstoque.findFirst({ where: { empresaId, tipo: 'CENTRAL' } })
    if (!local) throw new Error('Empresa sem estoque central configurado.')
    return local
  }
}
