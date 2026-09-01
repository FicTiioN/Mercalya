import { Injectable } from '@nestjs/common'
import { StatusCompra, TipoLocal } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'

const DIA_MS = 86_400_000

interface Notificacao {
  id: string
  tipo: 'estoque' | 'validade' | 'abastecimento' | 'compra' | 'perda' | 'sistema'
  severidade: 'critico' | 'atencao' | 'info' | 'sucesso'
  titulo: string
  descricao: string
  quando: string
  rota: string
  lida: boolean
}

/**
 * Notificações não são armazenadas: cada uma é **derivada de um fato** —
 * ruptura, vencimento, compra confirmada, perda registrada.
 *
 * O id é determinístico (deriva do fato que a originou), e é isso que permite
 * a marca de "lida" continuar valendo entre sessões sem guardar a notificação
 * em si. A marca é **por usuário**: o que a Ana leu não some para o colega.
 */
@Injectable()
export class NotificacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string, usuarioId: string) {
    const [derivadas, lidas] = await Promise.all([
      this.derivar(empresaId),
      this.prisma.notificacaoLida.findMany({
        where: { usuarioId },
        select: { chave: true },
      }),
    ])

    const marcadas = new Set(lidas.map((l) => l.chave))
    const itens = derivadas.map((n) => ({ ...n, lida: marcadas.has(n.id) }))

    return { itens, naoLidas: itens.filter((n) => !n.lida).length }
  }

  async marcarComoLida(usuarioId: string, chave: string) {
    await this.prisma.notificacaoLida.upsert({
      where: { usuarioId_chave: { usuarioId, chave } },
      create: { usuarioId, chave },
      update: {},
    })
  }

  async marcarTodasComoLidas(empresaId: string, usuarioId: string) {
    const derivadas = await this.derivar(empresaId)
    if (derivadas.length === 0) return

    await this.prisma.notificacaoLida.createMany({
      data: derivadas.map((n) => ({ usuarioId, chave: n.id })),
      skipDuplicates: true,
    })
  }

  /* ---------------------------------------------------------------- */

  private async derivar(empresaId: string): Promise<Notificacao[]> {
    const agora = Date.now()
    const locais = await this.prisma.localEstoque.findMany({ where: { empresaId } })
    const central = locais.find((l) => l.tipo === TipoLocal.CENTRAL)
    const lista: Notificacao[] = []

    /* ---- lotes vencendo ---- */
    const vencendo = await this.prisma.saldoEstoque.findMany({
      where: {
        empresaId,
        quantidade: { gt: 0 },
        lote: { validade: { gt: new Date(), lte: new Date(agora + 30 * DIA_MS) } },
      },
      include: { produto: { select: { nome: true } }, lote: true },
      orderBy: { lote: { validade: 'asc' } },
      take: 5,
    })

    for (const saldo of vencendo) {
      const dias = Math.ceil((saldo.lote!.validade!.getTime() - agora) / DIA_MS)
      lista.push({
        id: `venc-${saldo.id}`,
        tipo: 'validade',
        severidade: dias <= 7 ? 'critico' : 'atencao',
        titulo: `${saldo.produto.nome} vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        descricao: `Lote ${saldo.lote!.codigo} · ${numero(saldo.quantidade)} un em estoque.`,
        quando: saldo.atualizadoEm.toISOString(),
        rota: '/operacao/perdas-ajustes',
        lida: false,
      })
    }

    /* ---- ruptura no central ---- */
    if (central) {
      const produtos = await this.prisma.produto.findMany({
        where: { empresaId, status: 'ATIVO', pontoCompra: { gt: 0 } },
        select: { id: true, nome: true, pontoCompra: true },
      })
      const saldos = await this.prisma.saldoEstoque.groupBy({
        by: ['produtoId'],
        where: { empresaId, localId: central.id },
        _sum: { quantidade: true },
      })

      const abaixo = produtos
        .map((p) => ({
          ...p,
          estoque: numero(saldos.find((s) => s.produtoId === p.id)?._sum.quantidade),
        }))
        .filter((p) => p.estoque < numero(p.pontoCompra))
        .slice(0, 5)

      for (const p of abaixo) {
        lista.push({
          id: `ruptura-${p.id}`,
          tipo: 'estoque',
          severidade: p.estoque === 0 ? 'critico' : 'atencao',
          titulo:
            p.estoque === 0
              ? `${p.nome} zerado no estoque central`
              : `${p.nome} abaixo do ponto de compra`,
          descricao: `${p.estoque} un — recompra a partir de ${numero(p.pontoCompra)} un.`,
          quando: new Date().toISOString(),
          rota: '/operacao/compras/nova',
          lida: false,
        })
      }
    }

    /* ---- compras confirmadas recentemente ---- */
    const compras = await this.prisma.compra.findMany({
      where: {
        empresaId,
        status: StatusCompra.CONFIRMADA,
        criadoEm: { gte: new Date(agora - 7 * DIA_MS) },
      },
      include: { fornecedor: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
      take: 3,
    })

    for (const compra of compras) {
      lista.push({
        id: `compra-${compra.id}`,
        tipo: 'compra',
        severidade: 'sucesso',
        titulo: `Compra ${compra.numero} confirmada`,
        descricao: `${compra.fornecedor?.nome ?? 'Fornecedor'} · entrada no estoque central.`,
        quando: compra.criadoEm.toISOString(),
        rota: `/operacao/compras/${compra.id}`,
        lida: false,
      })
    }

    /* ---- perdas recentes ---- */
    const perdas = await this.prisma.perdaEstoque.findMany({
      where: { empresaId, data: { gte: new Date(agora - 7 * DIA_MS) } },
      include: { produto: { select: { nome: true } } },
      orderBy: { data: 'desc' },
      take: 3,
    })

    for (const perda of perdas) {
      lista.push({
        id: `perda-${perda.id}`,
        tipo: 'perda',
        severidade: 'atencao',
        titulo: `Perda registrada · ${perda.produto.nome}`,
        descricao: `${numero(perda.quantidade)} un · R$ ${numero(perda.valor).toFixed(2)}.`,
        quando: perda.data.toISOString(),
        rota: '/operacao/perdas-ajustes',
        lida: false,
      })
    }

    return lista.sort((a, b) => b.quando.localeCompare(a.quando))
  }
}
