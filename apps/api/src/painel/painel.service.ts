import { Injectable } from '@nestjs/common'
import { StatusCompra, StatusProduto, StatusVenda, TipoLocal, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'
import type { FiltroPainelDto } from './dto/filtro-painel.dto'

const DIA_MS = 86_400_000

/**
 * Painel gerencial.
 *
 * Até a migração das vendas, esta tela era uma **maquete**: o gráfico de
 * evolução era uma onda senoidal, os deltas eram constantes e o faturamento
 * era uma projeção sobre 6 movimentos. Nada disso sobreviveu — todo número
 * aqui é somado do banco.
 *
 * O que não dá para medir simplesmente **não é enviado**: sem meta de vendas
 * cadastrada, o campo vem ausente e a tela não desenha a barra de progresso.
 */
@Injectable()
export class PainelService {
  constructor(private readonly prisma: PrismaService) {}

  async carregar(empresaId: string, filtro: FiltroPainelDto) {
    const { inicio, fim } = this.periodo(filtro)
    const duracao = fim.getTime() - inicio.getTime()
    const inicioAnterior = new Date(inicio.getTime() - duracao)

    const [locais, atual, anterior] = await Promise.all([
      this.prisma.localEstoque.findMany({ where: { empresaId } }),
      this.medir(empresaId, inicio, fim, filtro.lojaId),
      this.medir(empresaId, inicioAnterior, inicio, filtro.lojaId),
    ])

    const central = locais.find((l) => l.tipo === TipoLocal.CENTRAL)
    const locaisLoja = locais.filter((l) => l.tipo === TipoLocal.LOJA)

    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, quantidade: { gt: 0 } },
      include: { lote: true, produto: true },
    })

    const valorEstoque = saldos.reduce(
      (acc, s) =>
        acc + numero(s.quantidade) * numero(s.lote?.custoUnitario ?? s.produto.custoMedio),
      0,
    )
    const itensLoja = saldos
      .filter((s) => locaisLoja.some((l) => l.id === s.localId))
      .reduce((acc, s) => acc + numero(s.quantidade), 0)

    const [
      evolucaoVendas,
      comprasXVendas,
      distribuicaoCategoria,
      estoqueBaixo,
      proximosVencimentos,
      topVendidos,
      semGiro,
      operacional,
    ] = await Promise.all([
      this.evolucaoVendas(empresaId, inicio, fim, filtro.granularidade ?? 'diario', filtro.lojaId),
      this.comprasXVendas(empresaId, inicio, fim, filtro.lojaId),
      this.distribuicaoPorCategoria(empresaId, inicio, fim, filtro.lojaId),
      this.estoqueBaixo(empresaId, central?.id),
      this.proximosVencimentos(empresaId),
      this.topVendidos(empresaId, inicio, fim, filtro.lojaId),
      this.semGiro(empresaId),
      this.resumoOperacional(empresaId, filtro.lojaId),
    ])

    const lucro = atual.vendas - atual.custo
    const lucroAnterior = anterior.vendas - anterior.custo
    const margem = atual.vendas ? (lucro / atual.vendas) * 100 : 0
    const margemAnterior = anterior.vendas ? (lucroAnterior / anterior.vendas) * 100 : 0

    return {
      kpis: {
        vendas: arredondar(atual.vendas),
        vendasDelta: variacao(atual.vendas, anterior.vendas),
        lucro: arredondar(lucro),
        lucroDelta: variacao(lucro, lucroAnterior),
        ticketMedio: arredondar(atual.tickets ? atual.vendas / atual.tickets : 0),
        ticketMedioDelta: variacao(
          atual.tickets ? atual.vendas / atual.tickets : 0,
          anterior.tickets ? anterior.vendas / anterior.tickets : 0,
        ),
        margem: Number(margem.toFixed(1)),
        // Margem é percentual: a variação é em pontos, não em porcentagem de
        // porcentagem. "Subiu 2 p.p." é o que o lojista entende.
        margemDelta: margemAnterior ? Number((margem - margemAnterior).toFixed(1)) : undefined,
        valorEstoque: arredondar(valorEstoque),
        valorEstoqueDelta: undefined,
        itensLoja,
        itensLojaDelta: undefined,
        compras: arredondar(atual.compras),
        comprasDelta: variacao(atual.compras, anterior.compras),
        perdas: arredondar(atual.perdas),
        perdasDelta: variacao(atual.perdas, anterior.perdas),
      },
      evolucaoVendas,
      comprasXVendas,
      distribuicaoCategoria,
      estoqueBaixo,
      proximosVencimentos,
      topVendidos,
      semGiro,
      alertas: montarAlertas(estoqueBaixo.length, proximosVencimentos.length, semGiro.length),
      resumoOperacional: operacional,
    }
  }

  async lojas(empresaId: string) {
    return this.prisma.loja.findMany({
      where: { empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })
  }

  /* ---------------------------------------------------------------- */

  private periodo(filtro: FiltroPainelDto) {
    const fim = filtro.ate ? new Date(`${filtro.ate}T23:59:59`) : new Date()
    const inicio = filtro.de
      ? new Date(`${filtro.de}T00:00:00`)
      : new Date(fim.getTime() - 30 * DIA_MS)
    return { inicio, fim }
  }

  /** Os números do período: faturamento, custo, compras e perdas. */
  private async medir(empresaId: string, inicio: Date, fim: Date, lojaId?: string) {
    const [vendas, custoMov, compras, perdas] = await Promise.all([
      this.prisma.venda.findMany({
        where: {
          empresaId,
          status: StatusVenda.CONCLUIDA,
          data: { gte: inicio, lte: fim },
          ...(lojaId ? { lojaId } : {}),
        },
        select: { total: true },
      }),
      this.prisma.movimentacaoEstoque.findMany({
        where: {
          empresaId,
          tipo: TipoMovimentacao.VENDA,
          data: { gte: inicio, lte: fim },
        },
        select: { quantidade: true, custoUnitario: true },
      }),
      this.prisma.compra.aggregate({
        where: {
          empresaId,
          status: StatusCompra.CONFIRMADA,
          criadoEm: { gte: inicio, lte: fim },
        },
        _sum: { total: true },
      }),
      this.prisma.perdaEstoque.aggregate({
        where: { empresaId, data: { gte: inicio, lte: fim } },
        _sum: { valor: true },
      }),
    ])

    return {
      vendas: vendas.reduce((acc, v) => acc + numero(v.total), 0),
      tickets: vendas.length,
      // O custo da venda vem da movimentação, que carrega o custo do lote que
      // efetivamente saiu — não do custo médio de hoje.
      custo: custoMov.reduce(
        (acc, m) => acc + Math.abs(numero(m.quantidade)) * numero(m.custoUnitario),
        0,
      ),
      compras: numero(compras._sum.total),
      perdas: numero(perdas._sum.valor),
    }
  }

  private async evolucaoVendas(
    empresaId: string,
    inicio: Date,
    fim: Date,
    granularidade: 'diario' | 'semanal' | 'mensal',
    lojaId?: string,
  ) {
    const vendas = await this.prisma.venda.findMany({
      where: {
        empresaId,
        status: StatusVenda.CONCLUIDA,
        data: { gte: inicio, lte: fim },
        ...(lojaId ? { lojaId } : {}),
      },
      select: { data: true, total: true },
      orderBy: { data: 'asc' },
    })

    const pontos = granularidade === 'diario' ? 30 : granularidade === 'semanal' ? 12 : 6
    const passo =
      granularidade === 'diario' ? DIA_MS : granularidade === 'semanal' ? 7 * DIA_MS : 30 * DIA_MS

    const serie: Array<{ label: string; valor: number; comparativo?: number }> = []
    const total = vendas.reduce((acc, v) => acc + numero(v.total), 0)
    const media = pontos > 0 ? total / pontos : 0

    for (let i = pontos - 1; i >= 0; i -= 1) {
      const ate = new Date(fim.getTime() - i * passo)
      const de = new Date(ate.getTime() - passo)
      const valor = vendas
        .filter((v) => v.data > de && v.data <= ate)
        .reduce((acc, v) => acc + numero(v.total), 0)

      serie.push({
        label:
          granularidade === 'diario'
            ? `${String(ate.getDate()).padStart(2, '0')}/${mes(ate)}`
            : granularidade === 'semanal'
              ? `S${pontos - i}`
              : mes(ate),
        valor: arredondar(valor),
        comparativo: arredondar(media),
      })
    }
    return serie
  }

  private async comprasXVendas(empresaId: string, inicio: Date, fim: Date, lojaId?: string) {
    const [vendas, compras] = await Promise.all([
      this.prisma.venda.findMany({
        where: {
          empresaId,
          status: StatusVenda.CONCLUIDA,
          data: { gte: inicio, lte: fim },
          ...(lojaId ? { lojaId } : {}),
        },
        select: { data: true, total: true },
      }),
      this.prisma.compra.findMany({
        where: {
          empresaId,
          status: StatusCompra.CONFIRMADA,
          criadoEm: { gte: inicio, lte: fim },
        },
        select: { criadoEm: true, total: true },
      }),
    ])

    const semanas = 5
    const passo = (fim.getTime() - inicio.getTime()) / semanas
    const serie = []

    for (let i = 0; i < semanas; i += 1) {
      const de = new Date(inicio.getTime() + i * passo)
      const ate = new Date(de.getTime() + passo)
      serie.push({
        label: `${String(de.getDate()).padStart(2, '0')}-${String(ate.getDate()).padStart(2, '0')}`,
        valor: arredondar(
          vendas.filter((v) => v.data >= de && v.data < ate).reduce((a, v) => a + numero(v.total), 0),
        ),
        comparativo: arredondar(
          compras
            .filter((c) => c.criadoEm >= de && c.criadoEm < ate)
            .reduce((a, c) => a + numero(c.total), 0),
        ),
      })
    }
    return serie
  }

  /** Por **venda realizada**, não por valor parado em estoque. */
  private async distribuicaoPorCategoria(
    empresaId: string,
    inicio: Date,
    fim: Date,
    lojaId?: string,
  ) {
    const [itens, categorias, produtos] = await Promise.all([
      this.prisma.itemVenda.findMany({
        where: {
          venda: {
            empresaId,
            status: StatusVenda.CONCLUIDA,
            data: { gte: inicio, lte: fim },
            ...(lojaId ? { lojaId } : {}),
          },
        },
        select: { produtoId: true, total: true },
      }),
      this.prisma.categoria.findMany({ where: { empresaId } }),
      this.prisma.produto.findMany({ where: { empresaId }, select: { id: true, categoriaId: true } }),
    ])

    const porCategoria = new Map<string, number>()
    for (const item of itens) {
      const categoriaId = produtos.find((p) => p.id === item.produtoId)?.categoriaId
      if (!categoriaId) continue
      porCategoria.set(categoriaId, (porCategoria.get(categoriaId) ?? 0) + numero(item.total))
    }

    const soma = [...porCategoria.values()].reduce((a, b) => a + b, 0)

    return categorias
      .map((c) => {
        const valor = porCategoria.get(c.id) ?? 0
        return {
          categoriaId: c.id,
          nome: c.nome,
          valor: arredondar(valor),
          percentual: soma ? Number(((valor / soma) * 100).toFixed(1)) : 0,
          cor: c.cor,
        }
      })
      .filter((c) => c.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }

  private async estoqueBaixo(empresaId: string, centralId?: string) {
    if (!centralId) return []

    const produtos = await this.prisma.produto.findMany({
      where: { empresaId, status: StatusProduto.ATIVO },
      select: { id: true, nome: true, pontoCompra: true },
    })
    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId'],
      where: { empresaId, localId: centralId },
      _sum: { quantidade: true },
    })

    return produtos
      .map((p) => ({
        produtoId: p.id,
        nome: p.nome,
        estoque: numero(saldos.find((s) => s.produtoId === p.id)?._sum.quantidade),
        minimo: numero(p.pontoCompra),
      }))
      .filter((p) => p.minimo > 0 && p.estoque < p.minimo)
      .sort((a, b) => a.estoque / (a.minimo || 1) - b.estoque / (b.minimo || 1))
      .slice(0, 6)
  }

  private async proximosVencimentos(empresaId: string) {
    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, quantidade: { gt: 0 }, lote: { validade: { not: null } } },
      include: { produto: { select: { nome: true } }, lote: true },
    })

    const agora = Date.now()
    return saldos
      .map((s) => ({
        produtoId: s.produtoId,
        nome: s.produto.nome,
        validade: s.lote!.validade!.toISOString(),
        dias: Math.ceil((s.lote!.validade!.getTime() - agora) / DIA_MS),
      }))
      .filter((v) => v.dias <= 30)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 6)
  }

  private async topVendidos(empresaId: string, inicio: Date, fim: Date, lojaId?: string) {
    const itens = await this.prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: {
        venda: {
          empresaId,
          status: StatusVenda.CONCLUIDA,
          data: { gte: inicio, lte: fim },
          ...(lojaId ? { lojaId } : {}),
        },
      },
      _sum: { quantidade: true, total: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 6,
    })
    if (itens.length === 0) return []

    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: itens.map((i) => i.produtoId) } },
      select: { id: true, nome: true, imagem: true },
    })

    return itens.map((i) => {
      const p = produtos.find((x) => x.id === i.produtoId)
      return {
        produtoId: i.produtoId,
        nome: p?.nome ?? '—',
        imagem: p?.imagem ?? '',
        quantidade: numero(i._sum.quantidade),
        receita: arredondar(numero(i._sum.total)),
      }
    })
  }

  private async semGiro(empresaId: string) {
    const limite = new Date(Date.now() - 30 * DIA_MS)
    const produtos = await this.prisma.produto.findMany({
      where: {
        empresaId,
        status: StatusProduto.ATIVO,
        OR: [{ ultimaVendaEm: null }, { ultimaVendaEm: { lt: limite } }],
      },
      select: { id: true, nome: true, ultimaVendaEm: true, custoMedio: true },
    })
    if (produtos.length === 0) return []

    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId'],
      where: { empresaId, produtoId: { in: produtos.map((p) => p.id) } },
      _sum: { quantidade: true },
    })

    return produtos
      .map((p) => {
        const estoque = numero(saldos.find((s) => s.produtoId === p.id)?._sum.quantidade)
        return {
          produtoId: p.id,
          nome: p.nome,
          ultimaVenda: p.ultimaVendaEm?.toISOString() ?? null,
          estoque,
          valor: arredondar(estoque * numero(p.custoMedio)),
        }
      })
      .filter((p) => p.estoque > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
  }

  private async resumoOperacional(empresaId: string, lojaId?: string) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const ontem = new Date(hoje.getTime() - DIA_MS)

    const [vendasHoje, vendasOntem, devolucoes] = await Promise.all([
      this.prisma.venda.findMany({
        where: {
          empresaId,
          status: StatusVenda.CONCLUIDA,
          data: { gte: hoje },
          ...(lojaId ? { lojaId } : {}),
        },
        include: { itens: { select: { quantidade: true } } },
      }),
      this.prisma.venda.findMany({
        where: {
          empresaId,
          status: StatusVenda.CONCLUIDA,
          data: { gte: ontem, lt: hoje },
          ...(lojaId ? { lojaId } : {}),
        },
        include: { itens: { select: { quantidade: true } } },
      }),
      this.prisma.movimentacaoEstoque.aggregate({
        where: { empresaId, tipo: TipoMovimentacao.DEVOLUCAO, data: { gte: hoje } },
        _sum: { valorTotal: true },
      }),
    ])

    const faturamento = vendasHoje.reduce((acc, v) => acc + numero(v.total), 0)
    const itens = (lista: typeof vendasHoje) =>
      lista.reduce((acc, v) => acc + v.itens.reduce((s, i) => s + numero(i.quantidade), 0), 0)

    const vendidosHoje = itens(vendasHoje)
    const vendidosOntem = itens(vendasOntem)
    const valorDevolucoes = numero(devolucoes._sum.valorTotal)

    return {
      vendasHoje: arredondar(faturamento),
      // `metaVendas` não é enviada: não existe meta cadastrada no sistema, e
      // inventar um alvo faria a barra de progresso mentir.
      clientesAtendidos: vendasHoje.length,
      ticketMedioHoje: arredondar(vendasHoje.length ? faturamento / vendasHoje.length : 0),
      produtosVendidos: vendidosHoje,
      produtosVendidosDelta: variacao(vendidosHoje, vendidosOntem),
      devolucoes: arredondar(valorDevolucoes),
      percentualDevolucoes: faturamento
        ? Number(((valorDevolucoes / faturamento) * 100).toFixed(1))
        : 0,
    }
  }
}

/* ------------------------------------------------------------------ */

function montarAlertas(estoqueBaixo: number, vencendo: number, semGiro: number) {
  const alertas = []

  if (estoqueBaixo > 0) {
    alertas.push({
      id: 'alerta-ruptura',
      severidade: 'critico' as const,
      titulo: `${estoqueBaixo} ${estoqueBaixo === 1 ? 'produto abaixo' : 'produtos abaixo'} do ponto de compra`,
      descricao: 'Recompra recomendada para evitar ruptura.',
      quantidade: estoqueBaixo,
      rota: '/operacao/compras/nova',
    })
  }
  if (vencendo > 0) {
    alertas.push({
      id: 'alerta-validade',
      severidade: 'atencao' as const,
      titulo: `${vencendo} ${vencendo === 1 ? 'lote vence' : 'lotes vencem'} nos próximos 30 dias`,
      descricao: 'Priorize a saída desses lotes.',
      quantidade: vencendo,
      rota: '/operacao/perdas-ajustes',
    })
  }
  if (semGiro > 0) {
    alertas.push({
      id: 'alerta-giro',
      severidade: 'info' as const,
      titulo: `${semGiro} ${semGiro === 1 ? 'produto sem giro' : 'produtos sem giro'} há mais de 30 dias`,
      descricao: 'Capital parado na prateleira.',
      quantidade: semGiro,
      rota: '/cadastros/produtos',
    })
  }
  return alertas
}

/** Sem base anterior não há percentual: o card omite a linha. */
function variacao(atual: number, anterior: number): number | undefined {
  if (!anterior) return undefined
  return Number((((atual - anterior) / anterior) * 100).toFixed(1))
}

function arredondar(valor: number): number {
  return Number(valor.toFixed(2))
}

function mes(data: Date): string {
  return data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}
