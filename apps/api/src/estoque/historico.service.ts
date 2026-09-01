import { Injectable } from '@nestjs/common'
import { MotivoPerda, Prisma, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { ConsultaPerdasDto } from './dto/consulta-perdas.dto'
import type { ConsultaMovimentacoesDto } from './dto/consulta-movimentacoes.dto'

const DIA_MS = 86_400_000

const ROTULOS_MOTIVO: Record<MotivoPerda, string> = {
  VENCIMENTO: 'Vencimento',
  QUEBRA: 'Quebra',
  AVARIA: 'Avaria',
  ROUBO: 'Roubo/Furto',
  ERRO_OPERACIONAL: 'Erro operacional',
  OUTROS: 'Outros',
}

/** Leituras do histórico: perdas e movimentações. Nada aqui escreve. */
@Injectable()
export class HistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------- perdas ------------------------------ */

  async listarPerdas(empresaId: string, consulta: ConsultaPerdasDto) {
    const perdas = await this.prisma.perdaEstoque.findMany({
      where: {
        empresaId,
        ...(consulta.motivo && consulta.motivo !== 'todos'
          ? { motivo: paraMotivo(consulta.motivo) }
          : {}),
        ...(consulta.localId ? { localId: consulta.localId } : {}),
      },
      include: { produto: true, local: true, lote: true },
      orderBy: { data: 'desc' },
    })

    let itens = perdas.map((p) => ({
      id: p.id,
      produtoId: p.produtoId,
      produtoNome: p.produto.nome,
      produtoImagem: p.produto.imagem,
      loteId: p.loteId,
      loteCodigo: p.lote?.codigo ?? null,
      localId: p.localId,
      localNome: p.local.nome,
      motivo: p.motivo.toLowerCase().replace(/_/g, '-'),
      motivoLabel: ROTULOS_MOTIVO[p.motivo],
      quantidade: numero(p.quantidade),
      valor: numero(p.valor),
      observacao: p.observacao,
      registradoPor: p.registradoPor,
      data: p.data.toISOString(),
    }))

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (p) =>
          normalizar(p.produtoNome).includes(termo) ||
          normalizar(p.motivoLabel).includes(termo) ||
          normalizar(p.registradoPor).includes(termo),
      )
    }

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  async resumoPerdas(empresaId: string) {
    const perdas = await this.prisma.perdaEstoque.findMany({
      where: { empresaId },
      select: { data: true, valor: true, motivo: true },
    })

    const agora = Date.now()
    const noIntervalo = (deDias: number, ateDias: number) =>
      perdas.filter((p) => {
        const idade = (agora - p.data.getTime()) / DIA_MS
        return idade >= deDias && idade < ateDias
      })

    const mes = noIntervalo(0, 30)
    const anterior = noIntervalo(30, 60)
    const soma = (l: typeof perdas) => l.reduce((acc, p) => acc + numero(p.valor), 0)

    const valorMes = soma(mes)
    const valorAnterior = soma(anterior)
    const vencidosMes = mes.filter((p) => p.motivo === MotivoPerda.VENCIMENTO).length
    const vencidosAnterior = anterior.filter((p) => p.motivo === MotivoPerda.VENCIMENTO).length

    const ajustes = await this.prisma.movimentacaoEstoque.count({
      where: {
        empresaId,
        tipo: TipoMovimentacao.AJUSTE,
        data: { gte: new Date(agora - 30 * DIA_MS) },
      },
    })

    return {
      perdasMes: mes.length,
      perdasMesDelta: variacao(mes.length, anterior.length),
      valorPerdido: Number(valorMes.toFixed(2)),
      valorPerdidoDelta: variacao(valorMes, valorAnterior),
      itensVencidos: vencidosMes,
      itensVencidosDelta: variacao(vencidosMes, vencidosAnterior),
      ajustesPendentes: ajustes,
    }
  }

  /** Lotes com saldo que vencem primeiro — o que ainda dá para salvar. */
  async proximosVencimentos(empresaId: string, limite = 5) {
    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, quantidade: { gt: 0 }, lote: { validade: { not: null } } },
      include: { produto: true, lote: true },
    })

    const agora = Date.now()
    return saldos
      .map((s) => ({
        saldoId: s.id,
        produtoId: s.produtoId,
        nome: s.produto.nome,
        imagem: s.produto.imagem,
        loteCodigo: s.lote?.codigo ?? '—',
        validade: s.lote?.validade?.toISOString() ?? '',
        dias: Math.ceil(((s.lote?.validade?.getTime() ?? agora) - agora) / DIA_MS),
        quantidade: numero(s.quantidade),
      }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, limite)
  }

  async topPerdas(empresaId: string, limite = 5) {
    const agrupado = await this.prisma.perdaEstoque.groupBy({
      by: ['produtoId'],
      where: { empresaId },
      _sum: { valor: true },
      orderBy: { _sum: { valor: 'desc' } },
      take: limite,
    })
    if (agrupado.length === 0) return []

    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: agrupado.map((a) => a.produtoId) } },
      select: { id: true, nome: true },
    })

    return agrupado.map((a) => ({
      produtoId: a.produtoId,
      nome: produtos.find((p) => p.id === a.produtoId)?.nome ?? '—',
      valor: numero(a._sum.valor),
    }))
  }

  /* ---------------------------- movimentações -------------------------- */

  async listarMovimentacoes(empresaId: string, consulta: ConsultaMovimentacoesDto) {
    const where: Prisma.MovimentacaoEstoqueWhereInput = { empresaId }

    if (consulta.tipo && consulta.tipo !== 'todos') {
      where.tipo = consulta.tipo as TipoMovimentacao
    }
    if (consulta.produtoId) where.produtoId = consulta.produtoId
    if (consulta.usuario) where.usuario = consulta.usuario
    if (consulta.origemId) where.origemId = consulta.origemId
    if (consulta.destinoId) where.destinoId = consulta.destinoId
    if (consulta.de || consulta.ate) {
      where.data = {
        ...(consulta.de ? { gte: new Date(`${consulta.de}T00:00:00`) } : {}),
        ...(consulta.ate ? { lte: new Date(`${consulta.ate}T23:59:59`) } : {}),
      }
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: { produto: { include: { marca: true } }, lote: true },
      orderBy: { data: 'desc' },
    })

    let itens = movimentacoes.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      produtoId: m.produtoId,
      produtoNome: m.produto.nome,
      produtoImagem: m.produto.imagem,
      produtoSku: m.produto.sku ?? '',
      marcaNome: m.produto.marca?.nome ?? null,
      loteId: m.loteId,
      loteCodigo: m.lote?.codigo ?? null,
      loteValidade: m.lote?.validade?.toISOString() ?? null,
      quantidade: numero(m.quantidade),
      origemId: m.origemId,
      origemLabel: m.origemLabel,
      destinoId: m.destinoId,
      destinoLabel: m.destinoLabel,
      usuario: m.usuario,
      observacao: m.observacao,
      documento: m.documento,
      custoUnitario: m.custoUnitario === null ? null : numero(m.custoUnitario),
      valorTotal: m.valorTotal === null ? null : numero(m.valorTotal),
      data: m.data.toISOString(),
      status: m.status.toLowerCase() as 'concluida' | 'cancelada',
    }))

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (m) =>
          normalizar(m.produtoNome).includes(termo) ||
          normalizar(m.usuario).includes(termo) ||
          normalizar(m.documento).includes(termo) ||
          normalizar(m.observacao).includes(termo),
      )
    }

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  async resumoMovimentacoes(empresaId: string) {
    const agora = Date.now()
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: { empresaId, data: { gte: new Date(agora - 60 * DIA_MS) } },
      select: { tipo: true, quantidade: true, data: true },
    })

    const janela = (deDias: number, ateDias: number, tipo: TipoMovimentacao) =>
      movimentacoes.filter((m) => {
        const idade = (agora - m.data.getTime()) / DIA_MS
        return m.tipo === tipo && idade >= deDias && idade < ateDias
      })

    const bloco = (tipo: TipoMovimentacao) => {
      const atual = janela(0, 30, tipo)
      const anterior = janela(30, 60, tipo)
      return {
        quantidade: atual.length,
        itens: atual.reduce((acc, m) => acc + Math.abs(numero(m.quantidade)), 0),
        delta: variacao(atual.length, anterior.length),
      }
    }

    const entradas = bloco(TipoMovimentacao.ENTRADA)
    const transferencias = bloco(TipoMovimentacao.TRANSFERENCIA)
    const ajustes = bloco(TipoMovimentacao.AJUSTE)
    const perdas = bloco(TipoMovimentacao.PERDA)

    return {
      entradasDia: entradas.quantidade,
      entradasItens: entradas.itens,
      entradasDelta: entradas.delta,
      transferencias: transferencias.quantidade,
      transferenciasItens: transferencias.itens,
      transferenciasDelta: transferencias.delta,
      ajustes: ajustes.quantidade,
      ajustesItens: ajustes.itens,
      ajustesDelta: ajustes.delta,
      perdas: perdas.quantidade,
      perdasItens: perdas.itens,
      perdasDelta: perdas.delta,
    }
  }

  /** Quem já movimentou estoque — alimenta o filtro por usuário. */
  async usuariosDeMovimentacao(empresaId: string): Promise<string[]> {
    const linhas = await this.prisma.movimentacaoEstoque.findMany({
      where: { empresaId, usuario: { not: '' } },
      distinct: ['usuario'],
      select: { usuario: true },
      orderBy: { usuario: 'asc' },
    })
    return linhas.map((l) => l.usuario)
  }

  /** Linha do tempo de uma movimentação, para o painel lateral. */
  async historicoMovimentacao(empresaId: string, id: string) {
    const mov = await this.prisma.movimentacaoEstoque.findFirst({ where: { id, empresaId } })
    if (!mov) return []

    const eventos = [
      {
        titulo: 'Movimentação registrada',
        descricao: `${mov.tipo} de ${Math.abs(numero(mov.quantidade))} un`,
        autor: mov.usuario || 'Sistema',
        quando: mov.data.toISOString(),
      },
    ]

    if (mov.documento) {
      eventos.push({
        titulo: 'Documento vinculado',
        descricao: mov.documento,
        autor: mov.usuario || 'Sistema',
        quando: mov.data.toISOString(),
      })
    }
    if (mov.observacao) {
      eventos.push({
        titulo: 'Observação',
        descricao: mov.observacao,
        autor: mov.usuario || 'Sistema',
        quando: mov.data.toISOString(),
      })
    }

    return eventos
  }
}

function paraMotivo(valor: string): MotivoPerda {
  return valor.toUpperCase().replace(/-/g, '_') as MotivoPerda
}

/** Variação percentual; sem base anterior não há percentual a mostrar. */
function variacao(atual: number, anterior: number): number {
  if (!anterior) return 0
  return ((atual - anterior) / anterior) * 100
}

function paginar<T>(itens: T[], pagina = 1, porPagina = 10) {
  const total = itens.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const atual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (atual - 1) * porPagina

  return {
    itens: itens.slice(inicio, inicio + porPagina),
    total,
    pagina: atual,
    porPagina,
    totalPaginas,
  }
}
