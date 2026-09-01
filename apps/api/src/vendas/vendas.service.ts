import { Injectable, NotFoundException } from '@nestjs/common'
import { FormaPagamentoVenda, Prisma, StatusVenda } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { ConsultaVendasDto } from './dto/consulta-vendas.dto'

const DIA_MS = 86_400_000

const ROTULOS_PAGAMENTO: Record<FormaPagamentoVenda, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
}

type VendaCompleta = Prisma.VendaGetPayload<{ include: { itens: true; loja: true } }>

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string, consulta: ConsultaVendasDto) {
    const vendas = await this.buscar(empresaId, consulta)
    let itens = vendas.map((v) => this.paraContrato(v))

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (v) =>
          normalizar(v.numero).includes(termo) ||
          normalizar(v.clienteNome).includes(termo) ||
          normalizar(v.operador).includes(termo),
      )
    }

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  /**
   * KPIs do período, com variação contra o período **imediatamente anterior de
   * mesma duração**.
   *
   * Diferente da Loja, aqui o delta é calculável: as vendas têm data e valor,
   * então comparar 30 dias com os 30 anteriores é uma medição, não uma
   * estimativa. O mock devolvia 18,4% e 21,1% fixos.
   */
  async resumo(empresaId: string, consulta: ConsultaVendasDto) {
    const atual = await this.buscar(empresaId, consulta)
    const anterior = await this.buscarPeriodoAnterior(empresaId, consulta)

    const medir = (vendas: VendaCompleta[]) => {
      const concluidas = vendas.filter((v) => v.status === StatusVenda.CONCLUIDA)
      const faturamento = concluidas.reduce((acc, v) => acc + numero(v.total), 0)
      const itensVendidos = concluidas.reduce(
        (acc, v) => acc + v.itens.reduce((s, i) => s + numero(i.quantidade), 0),
        0,
      )
      return {
        total: vendas.length,
        faturamento,
        ticket: concluidas.length ? faturamento / concluidas.length : 0,
        itensVendidos,
        canceladas: vendas.filter((v) => v.status === StatusVenda.CANCELADA).length,
      }
    }

    const a = medir(atual)
    const b = medir(anterior)

    return {
      totalVendas: a.total,
      totalVendasDelta: variacao(a.total, b.total),
      faturamentoBruto: Number(a.faturamento.toFixed(2)),
      faturamentoDelta: variacao(a.faturamento, b.faturamento),
      ticketMedio: Number(a.ticket.toFixed(2)),
      ticketMedioDelta: variacao(a.ticket, b.ticket),
      itensVendidos: a.itensVendidos,
      itensVendidosDelta: variacao(a.itensVendidos, b.itensVendidos),
      canceladas: a.canceladas,
      canceladasDelta: variacao(a.canceladas, b.canceladas),
    }
  }

  async obter(empresaId: string, id: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { empresaId, OR: [{ id }, { numero: id }] },
      include: { itens: true, loja: true },
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')
    return this.paraContrato(venda)
  }

  /** Linha do tempo da venda, derivada do próprio registro. */
  async historico(empresaId: string, id: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { empresaId, OR: [{ id }, { numero: id }] },
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')

    const eventos = [
      {
        icone: 'venda' as const,
        titulo: 'Venda registrada',
        descricao: `A venda foi registrada no ${venda.canal} pelo operador.`,
        quando: venda.data.toISOString(),
        autor: venda.operador,
      },
    ]

    if (venda.status === StatusVenda.CANCELADA) {
      eventos.push({
        icone: 'cancelamento' as never,
        titulo: 'Venda cancelada',
        descricao: 'O pagamento não foi aprovado e a venda foi estornada.',
        quando: (venda.canceladaEm ?? venda.atualizadoEm).toISOString(),
        autor: venda.operador,
      })
      return eventos
    }

    const pago = venda.pagamentoQuando ?? venda.data
    eventos.push(
      {
        icone: 'pagamento' as never,
        titulo: 'Pagamento aprovado',
        descricao: `Pagamento em ${ROTULOS_PAGAMENTO[venda.pagamentoForma].toLowerCase()} aprovado.`,
        quando: pago.toISOString(),
        autor: venda.operador,
      },
      {
        icone: 'comprovante' as never,
        titulo: 'Comprovante emitido',
        descricao: 'Comprovante impresso para o cliente.',
        quando: new Date(pago.getTime() + 60_000).toISOString(),
        autor: venda.operador,
      },
    )

    return eventos
  }

  async lojas(empresaId: string) {
    const lojas = await this.prisma.loja.findMany({
      where: { empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })
    return lojas
  }

  /* ---------------------------------------------------------------- */

  private async buscar(empresaId: string, consulta: ConsultaVendasDto) {
    return this.prisma.venda.findMany({
      where: this.filtro(empresaId, consulta),
      include: { itens: true, loja: true },
      orderBy: { data: 'desc' },
    })
  }

  /** Mesma duração do período consultado, imediatamente antes dele. */
  private async buscarPeriodoAnterior(empresaId: string, consulta: ConsultaVendasDto) {
    const fim = consulta.ate ? new Date(`${consulta.ate}T23:59:59`) : new Date()
    const inicio = consulta.de ? new Date(`${consulta.de}T00:00:00`) : new Date(fim.getTime() - 30 * DIA_MS)
    const duracao = fim.getTime() - inicio.getTime()

    return this.prisma.venda.findMany({
      where: {
        ...this.filtro(empresaId, { ...consulta, de: undefined, ate: undefined }),
        data: { gte: new Date(inicio.getTime() - duracao), lt: inicio },
      },
      include: { itens: true, loja: true },
    })
  }

  private filtro(empresaId: string, consulta: ConsultaVendasDto): Prisma.VendaWhereInput {
    const where: Prisma.VendaWhereInput = { empresaId }

    if (consulta.lojaId) where.lojaId = consulta.lojaId
    if (consulta.status && consulta.status !== 'todos') {
      where.status =
        consulta.status === 'cancelada' ? StatusVenda.CANCELADA : StatusVenda.CONCLUIDA
    }
    if (consulta.formaPagamento && consulta.formaPagamento !== 'todas') {
      where.pagamentoForma = consulta.formaPagamento
        .toUpperCase()
        .replace(/-/g, '_') as FormaPagamentoVenda
    }
    if (consulta.de || consulta.ate) {
      where.data = {
        ...(consulta.de ? { gte: new Date(`${consulta.de}T00:00:00`) } : {}),
        ...(consulta.ate ? { lte: new Date(`${consulta.ate}T23:59:59`) } : {}),
      }
    }
    return where
  }

  private paraContrato(venda: VendaCompleta) {
    return {
      id: venda.id,
      numero: venda.numero,
      lojaId: venda.lojaId,
      lojaNome: venda.loja?.nome ?? '—',
      data: venda.data.toISOString(),
      clienteNome: venda.clienteNome,
      operador: venda.operador,
      itens: venda.itens.map((i) => ({
        id: i.id,
        produtoId: i.produtoId,
        produtoNome: i.produtoNome,
        ean: i.ean,
        imagem: i.imagem,
        quantidade: numero(i.quantidade),
        precoUnitario: numero(i.precoUnitario),
        total: numero(i.total),
      })),
      subtotal: numero(venda.subtotal),
      desconto: numero(venda.desconto),
      acrescimo: numero(venda.acrescimo),
      total: numero(venda.total),
      pagamento: {
        forma: venda.pagamentoForma.toLowerCase().replace(/_/g, '-') as never,
        valorPago: numero(venda.pagamentoValor),
        status: venda.pagamentoStatus.toLowerCase() as never,
        quando: (venda.pagamentoQuando ?? venda.data).toISOString(),
      },
      troco: numero(venda.troco),
      tipoVenda: venda.tipoVenda,
      canal: venda.canal,
      observacao: venda.observacao,
      status: venda.status.toLowerCase() as never,
      registradoEm: venda.criadoEm.toISOString(),
      atualizadoEm: venda.atualizadoEm.toISOString(),
      idInterno: venda.id,
      totalItens: venda.itens.reduce((acc, i) => acc + numero(i.quantidade), 0),
    }
  }
}

/**
 * Sem base anterior não há percentual: devolve `undefined` para o card omitir
 * a linha. Zero afirmaria estabilidade onde não houve com o que comparar —
 * mesmo critério aplicado no resumo da Loja.
 */
function variacao(atual: number, anterior: number): number | undefined {
  if (!anterior) return undefined
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
