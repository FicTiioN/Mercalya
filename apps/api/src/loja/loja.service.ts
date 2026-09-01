import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TipoLocal, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NucleoEstoqueService } from '../estoque/nucleo.service'
import { numero } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { ConsultaLojaDto } from './dto/consulta-loja.dto'
import type { RetirarDaLojaDto } from './dto/retirar-da-loja.dto'

const DIA_MS = 86_400_000

@Injectable()
export class LojaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nucleo: NucleoEstoqueService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * A loja é uma lista simples: o que interessa é se o produto está
   * **disponível para venda**, não onde está fisicamente. Um produto pode ter
   * vários lotes na prateleira; aqui eles aparecem somados numa linha só.
   */
  async listar(empresaId: string, consulta: ConsultaLojaDto) {
    const itens = await this.montarItens(empresaId, consulta.lojaId)

    let filtrados = itens
    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      filtrados = filtrados.filter(
        (i) =>
          normalizar(i.produtoNome).includes(termo) ||
          normalizar(i.categoriaNome).includes(termo),
      )
    }

    if (consulta.status === 'nao-vendido') {
      // O único filtro que olha para os desativados.
      return filtrados.filter((i) => !i.ativo)
    }

    filtrados = filtrados.filter((i) => i.ativo)
    if (consulta.status && consulta.status !== 'todos') {
      filtrados = filtrados.filter((i) => i.status === consulta.status)
    }
    return filtrados
  }

  /**
   * KPIs da loja.
   *
   * `itensExpostosDelta` é reconstruído das movimentações do período: o saldo
   * de hoje menos o que entrou e saiu nos últimos 30 dias dá o saldo de então.
   *
   * **Delta que não dá para calcular vem ausente, não zerado.** O card só
   * desenha a linha de variação quando o campo existe, e "0,0% vs ontem" seria
   * tão falso quanto os 8,4% fixos que o mock devolvia: afirma estabilidade
   * onde não houve medição. A variação do valor potencial exigiria histórico de
   * preços, e a de estoque baixo exigiria histórico de mínimos — nenhum dos
   * dois é guardado.
   */
  async resumo(empresaId: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const itens = (await this.montarItens(empresaId, loja)).filter((i) => i.ativo)

    const itensExpostos = itens.reduce((acc, i) => acc + i.quantidade, 0)
    const valorPotencialVenda = itens.reduce((acc, i) => acc + i.quantidade * i.precoVenda, 0)
    const estoqueBaixoNaLoja = itens.filter((i) => i.status !== 'disponivel').length

    const local = await this.localDaLoja(empresaId, loja)
    const central = await this.nucleo.localCentral(this.prisma, empresaId)

    // Reposição sugerida: o que falta para o ideal, limitado ao que o central tem.
    const configs = await this.prisma.configuracaoProdutoLoja.findMany({
      where: { lojaId: loja, ativo: true },
      include: { produto: true },
    })
    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId', 'localId'],
      where: { empresaId },
      _sum: { quantidade: true },
    })
    const total = (produtoId: string, localId: string) =>
      numero(saldos.find((s) => s.produtoId === produtoId && s.localId === localId)?._sum.quantidade)

    let reposicaoItens = 0
    let reposicaoValor = 0
    for (const config of configs) {
      const naLoja = local ? total(config.produtoId, local.id) : 0
      const noCentral = total(config.produtoId, central.id)
      const faltando = Math.min(Math.max(0, numero(config.estoqueIdeal) - naLoja), noCentral)
      reposicaoItens += faltando
      reposicaoValor += faltando * numero(config.produto.custoMedio)
    }

    let itensExpostosDelta: number | undefined
    if (local) {
      const movimentado = await this.prisma.movimentacaoEstoque.findMany({
        where: {
          empresaId,
          data: { gte: new Date(Date.now() - 30 * DIA_MS) },
          OR: [{ origemId: local.id }, { destinoId: local.id }],
        },
        select: { quantidade: true, origemId: true, destinoId: true },
      })
      const liquido = movimentado.reduce((acc, m) => {
        const q = Math.abs(numero(m.quantidade))
        if (m.destinoId === local.id) return acc + q
        if (m.origemId === local.id) return acc - q
        return acc
      }, 0)
      const antes = itensExpostos - liquido
      // Sem saldo anterior não há percentual: tudo que existe hoje é novo.
      itensExpostosDelta = antes > 0 ? (liquido / antes) * 100 : undefined
    }

    return {
      itensExpostos,
      itensExpostosDelta,
      valorPotencialVenda: Number(valorPotencialVenda.toFixed(2)),
      estoqueBaixoNaLoja,
      reposicaoSugerida: reposicaoItens,
      valorReposicao: Number(reposicaoValor.toFixed(2)),
    }
  }

  /* ---------------------------------------------------------------- */
  /* Retirada — devolução da loja para o central                       */
  /* ---------------------------------------------------------------- */

  /**
   * Retirar da prateleira é **devolver ao central**, não descartar: a
   * mercadoria continua existindo. Por isso o total da empresa não muda e a
   * movimentação é `DEVOLUCAO`, o espelho do abastecimento.
   *
   * Consome por FEFO e recria o saldo lote a lote no central — o que está mais
   * perto de vencer é o que deve voltar primeiro.
   */
  async retirar(empresaId: string, usuario: string, entrada: RetirarDaLojaDto) {
    return this.nucleo.executar(async (tx) => {
      const loja = entrada.lojaId ?? (await this.lojaPadrao(empresaId))
      const local = await tx.localEstoque.findFirst({
        where: { empresaId, lojaId: loja, tipo: TipoLocal.LOJA },
      })
      if (!local) throw new NotFoundException('Loja não encontrada.')

      const central = await this.nucleo.localCentral(tx, empresaId)
      const disponivel = await this.nucleo.totalNoLocal(tx, entrada.produtoId, local.id)

      if (entrada.quantidade <= 0 || entrada.quantidade > disponivel) {
        throw new ConflictException(
          `Quantidade inválida. Disponível na loja: ${disponivel}.`,
        )
      }

      const consumidos = await this.nucleo.consumirFefo(tx, {
        produtoId: entrada.produtoId,
        localId: local.id,
        quantidade: entrada.quantidade,
      })

      for (const consumo of consumidos) {
        await this.nucleo.aplicarSaldo(tx, {
          empresaId,
          produtoId: entrada.produtoId,
          loteId: consumo.loteId,
          localId: central.id,
          delta: consumo.quantidade,
        })

        await this.nucleo.registrarMovimentacao(tx, {
          empresaId,
          tipo: TipoMovimentacao.DEVOLUCAO,
          produtoId: entrada.produtoId,
          loteId: consumo.loteId,
          quantidade: consumo.quantidade,
          origemId: local.id,
          origemLabel: local.nome,
          destinoId: central.id,
          destinoLabel: central.nome,
          usuario,
          observacao: 'Retirada da loja',
          documento: '',
          custoUnitario: consumo.custoUnitario,
          valorTotal: Number((consumo.quantidade * consumo.custoUnitario).toFixed(2)),
        })
      }
    })
  }

  /* ---------------------------------------------------------------- */

  private async montarItens(empresaId: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const local = await this.localDaLoja(empresaId, loja)

    const configs = await this.prisma.configuracaoProdutoLoja.findMany({
      where: { lojaId: loja, produto: { empresaId } },
      include: { produto: { include: { categoria: true } } },
    })
    if (configs.length === 0) return []

    const saldos = local
      ? await this.prisma.saldoEstoque.findMany({
          where: { empresaId, localId: local.id },
          select: { produtoId: true, quantidade: true, atualizadoEm: true },
        })
      : []

    return configs
      .map((config) => {
        const meus = saldos.filter((s) => s.produtoId === config.produtoId)
        const quantidade = meus.reduce((acc, s) => acc + numero(s.quantidade), 0)
        const minimo = numero(config.estoqueMinimo)

        const ultimaReposicao = meus
          .map((s) => s.atualizadoEm.toISOString())
          .sort((a, b) => b.localeCompare(a))[0]

        return {
          produtoId: config.produtoId,
          produtoNome: config.produto.nome,
          produtoImagem: config.produto.imagem,
          categoriaNome: config.produto.categoria?.nome ?? '—',
          quantidade,
          precoVenda: numero(config.precoVenda),
          estoqueMinimo: minimo,
          ultimaReposicao: ultimaReposicao ?? null,
          status:
            quantidade <= 0
              ? ('indisponivel' as const)
              : quantidade < minimo
                ? ('estoque-baixo' as const)
                : ('disponivel' as const),
          ativo: config.ativo,
        }
      })
      .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, 'pt-BR'))
  }

  private async localDaLoja(empresaId: string, lojaId: string) {
    return this.prisma.localEstoque.findFirst({
      where: { empresaId, lojaId, tipo: TipoLocal.LOJA },
    })
  }

  private async lojaPadrao(empresaId: string): Promise<string> {
    const loja = await this.prisma.loja.findFirst({
      where: { empresaId, ativa: true },
      orderBy: { criadoEm: 'asc' },
      select: { id: true },
    })
    if (!loja) throw new NotFoundException('Nenhuma loja cadastrada nesta empresa.')
    return loja.id
  }
}
