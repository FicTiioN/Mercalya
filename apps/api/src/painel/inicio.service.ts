import { Injectable } from '@nestjs/common'
import { StatusCompra, StatusFornecedor, StatusProduto, TipoLocal } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { EstoqueService } from '../estoque/estoque.service'
import { numero } from '../comum/numero'

const DIA_MS = 86_400_000

const TITULOS_MOVIMENTACAO: Record<string, string> = {
  ENTRADA: 'Compra registrada',
  TRANSFERENCIA: 'Abastecimento concluído',
  PERDA: 'Perda registrada',
  AJUSTE: 'Ajuste de estoque',
  VENDA: 'Venda registrada',
  DEVOLUCAO: 'Devolução registrada',
}

/**
 * Início — guia de uso, não painel analítico.
 *
 * As etapas refletem o estado real da conta: uma base vazia mostra tudo
 * pendente, e é assim que um cliente novo deve encontrar a tela.
 */
@Injectable()
export class InicioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoque: EstoqueService,
  ) {}

  async resumo(empresaId: string) {
    const agora = Date.now()
    const semana = new Date(agora - 7 * DIA_MS)
    const semanaAnterior = new Date(agora - 14 * DIA_MS)
    const mes = new Date(agora - 30 * DIA_MS)

    const [produtos, produtosNovos, fornecedores, fornecedoresNovos, compras, locais] =
      await Promise.all([
        this.prisma.produto.count({ where: { empresaId } }),
        this.prisma.produto.count({ where: { empresaId, criadoEm: { gte: mes } } }),
        this.prisma.fornecedor.count({ where: { empresaId, status: StatusFornecedor.ATIVO } }),
        this.prisma.fornecedor.count({ where: { empresaId, criadoEm: { gte: mes } } }),
        this.prisma.compra.findMany({
          where: { empresaId, status: StatusCompra.CONFIRMADA },
          select: { total: true, criadoEm: true },
        }),
        this.prisma.localEstoque.findMany({ where: { empresaId } }),
      ])

    const central = locais.find((l) => l.tipo === TipoLocal.CENTRAL)
    const locaisLoja = locais.filter((l) => l.tipo === TipoLocal.LOJA)

    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['localId'],
      where: { empresaId },
      _sum: { quantidade: true },
    })
    const itensCentral = central
      ? numero(saldos.find((s) => s.localId === central.id)?._sum.quantidade)
      : 0
    const itensLoja = saldos
      .filter((s) => locaisLoja.some((l) => l.id === s.localId))
      .reduce((acc, s) => acc + numero(s._sum.quantidade), 0)

    const soma = (de: Date, ate?: Date) =>
      compras
        .filter((c) => c.criadoEm >= de && (!ate || c.criadoEm < ate))
        .reduce((acc, c) => acc + numero(c.total), 0)

    const comprasSemana = soma(semana)
    const comprasAnterior = soma(semanaAnterior, semana)

    const sugestoes = await this.estoque.sugestoes(empresaId).catch(() => [])
    const prontidao = await this.calcularProntidao(empresaId)

    const etapas = [
      {
        ordem: 1,
        chave: 'produtos',
        icone: 'package',
        titulo: 'Produtos',
        descricao: 'Cadastre seus produtos e organize categorias.',
        estado: produtos > 0 ? 'concluido' : 'pendente',
        metrica: String(produtos),
        metricaLabel: 'produtos',
        ctaLabel: 'Cadastrar produto',
        ctaRota: '/cadastros/produtos/novo',
        ctaVariante: produtos > 0 ? 'outline' : 'primary',
      },
      {
        ordem: 2,
        chave: 'fornecedores',
        icone: 'users',
        titulo: 'Fornecedores',
        descricao: 'Cadastre fornecedores e mantenha dados atualizados.',
        estado: fornecedores > 0 ? 'concluido' : 'pendente',
        metrica: String(fornecedores),
        metricaLabel: 'fornecedores',
        ctaLabel: 'Cadastrar fornecedor',
        ctaRota: '/cadastros/fornecedores/novo',
        ctaVariante: 'outline',
      },
      {
        ordem: 3,
        chave: 'compras',
        icone: 'shopping-cart',
        titulo: 'Nova compra',
        descricao: 'Registre compras e abasteça o estoque central.',
        estado: compras.length > 0 ? 'concluido' : 'pendente',
        metrica: valorCurto(comprasSemana),
        metricaLabel: 'esta semana',
        ctaLabel: 'Registrar compra',
        ctaRota: '/operacao/compras/nova',
        ctaVariante: 'outline',
      },
      {
        ordem: 4,
        chave: 'estoque',
        icone: 'warehouse',
        titulo: 'Estoque central',
        descricao: 'Acompanhe o estoque central e mantenha níveis ideais.',
        estado: itensCentral > 0 ? 'em-andamento' : 'pendente',
        metrica: itensCentral.toLocaleString('pt-BR'),
        metricaLabel: 'itens em estoque',
        ctaLabel: 'Ver estoque',
        ctaRota: '/operacao/estoque-central',
        ctaVariante: 'amber',
      },
      {
        ordem: 5,
        chave: 'abastecimento',
        icone: 'store',
        titulo: 'Abastecer loja',
        descricao: 'Selecione produtos e envie para a loja de forma prática.',
        estado: sugestoes.length > 0 ? 'pendente' : itensLoja > 0 ? 'concluido' : 'pendente',
        metrica: String(sugestoes.length),
        metricaLabel: 'itens sugeridos',
        ctaLabel: 'Abastecer agora',
        ctaRota: '/operacao/abastecimento',
        ctaVariante: 'outline',
      },
      {
        ordem: 6,
        chave: 'loja',
        icone: 'shopping-bag',
        titulo: 'Loja pronta para vender',
        descricao: 'Estoque abastecido, preços definidos e loja pronta para vender.',
        estado: prontidao >= 85 ? 'concluido' : 'pendente',
        metrica: `${prontidao}%`,
        metricaLabel: 'pronto',
        ctaLabel: 'Ver loja',
        ctaRota: '/operacao/loja',
        ctaVariante: 'outline',
      },
    ]

    const concluidas = etapas.filter((e) => e.estado === 'concluido').length

    return {
      etapas,
      progresso: Math.round((concluidas / etapas.length) * 100),
      etapasConcluidas: concluidas,
      totalEtapas: etapas.length,
      indicadores: {
        produtosCadastrados: produtos,
        // Quanto do catálogo nasceu no último mês. Antes era 5,2% fixo.
        produtosDelta: produtos ? Number(((produtosNovos / produtos) * 100).toFixed(1)) : undefined,
        fornecedoresAtivos: fornecedores,
        fornecedoresNovosMes: fornecedoresNovos,
        comprasSemana: Number(comprasSemana.toFixed(2)),
        comprasDelta: comprasAnterior
          ? Number((((comprasSemana - comprasAnterior) / comprasAnterior) * 100).toFixed(1))
          : undefined,
        itensNaLoja: itensLoja,
        percentualDoCentral:
          itensCentral + itensLoja > 0
            ? Math.round((itensLoja / (itensCentral + itensLoja)) * 100)
            : 0,
      },
      atividades: await this.atividades(empresaId),
      sugestoes: await this.alertas(empresaId, sugestoes.length),
    }
  }

  async dicas() {
    return [
      { id: 'd1', texto: 'Mantenha o estoque central sempre atualizado para evitar rupturas.' },
      { id: 'd2', texto: 'Confira as validades ao receber uma compra — o lote entra com ela.' },
      { id: 'd3', texto: 'O preço de venda é definido por loja, no cadastro do produto.' },
      { id: 'd4', texto: 'Abastecer é transferir: o total da empresa não muda.' },
    ]
  }

  /* ---------------------------------------------------------------- */

  private async atividades(empresaId: string) {
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: { empresaId },
      include: { produto: { select: { nome: true, unidade: true } } },
      orderBy: { data: 'desc' },
      take: 4,
    })

    return movimentacoes.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      titulo: TITULOS_MOVIMENTACAO[m.tipo] ?? 'Movimentação',
      descricao: `${m.produto.nome} · ${Math.abs(numero(m.quantidade))} ${m.produto.unidade.toLowerCase()}`,
      quando: m.data.toISOString(),
      usuario: m.usuario || 'Sistema',
      iniciais: iniciais(m.usuario || 'Sistema'),
    }))
  }

  private async alertas(empresaId: string, sugestoes: number) {
    const lista = []

    if (sugestoes > 0) {
      lista.push({
        id: 'sug-abastecer',
        severidade: 'atencao' as const,
        titulo: `Abastecer ${sugestoes} ${sugestoes === 1 ? 'item sugerido' : 'itens sugeridos'} para a loja`,
        descricao: 'Baseado no estoque ideal de cada produto.',
        quantidade: sugestoes,
        rota: '/operacao/abastecimento',
      })
    }

    const vencendo = await this.prisma.saldoEstoque.count({
      where: {
        empresaId,
        quantidade: { gt: 0 },
        lote: { validade: { gt: new Date(), lte: new Date(Date.now() + 7 * DIA_MS) } },
      },
    })
    if (vencendo > 0) {
      lista.push({
        id: 'sug-validade',
        severidade: 'critico' as const,
        titulo: `${vencendo} ${vencendo === 1 ? 'lote vence' : 'lotes vencem'} em até 7 dias`,
        descricao: 'Priorize a saída antes que vire perda.',
        quantidade: vencendo,
        rota: '/operacao/perdas-ajustes',
      })
    }

    return lista
  }

  /** Quanto do que a loja deveria expor já está na prateleira. */
  private async calcularProntidao(empresaId: string): Promise<number> {
    const configs = await this.prisma.configuracaoProdutoLoja.findMany({
      where: { ativo: true, produto: { empresaId, status: StatusProduto.ATIVO } },
      select: { produtoId: true, lojaId: true, estoqueIdeal: true },
    })
    if (configs.length === 0) return 0

    const locais = await this.prisma.localEstoque.findMany({
      where: { empresaId, tipo: TipoLocal.LOJA },
      select: { id: true, lojaId: true },
    })
    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId', 'localId'],
      where: { empresaId },
      _sum: { quantidade: true },
    })

    let atendidos = 0
    for (const config of configs) {
      const local = locais.find((l) => l.lojaId === config.lojaId)
      if (!local) continue
      const naLoja = numero(
        saldos.find((s) => s.produtoId === config.produtoId && s.localId === local.id)?._sum
          .quantidade,
      )
      const ideal = numero(config.estoqueIdeal)
      if (ideal <= 0 ? naLoja > 0 : naLoja >= ideal) atendidos += 1
    }

    return Math.round((atendidos / configs.length) * 100)
  }
}

function valorCurto(valor: number): string {
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(1).replace('.', ',')} mil`
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
