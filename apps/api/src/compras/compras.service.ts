import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, StatusCompra, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NucleoEstoqueService } from '../estoque/nucleo.service'
import { numero } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { EntradaCompraDto } from './dto/entrada-compra.dto'
import type { ConsultaBaseDto } from '../comum/consulta-base.dto'

@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nucleo: NucleoEstoqueService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  async listar(empresaId: string, consulta: ConsultaBaseDto) {
    const compras = await this.prisma.compra.findMany({
      where: { empresaId },
      include: { fornecedor: true, itens: true },
      orderBy: { criadoEm: 'desc' },
    })

    let itens = compras.map((c) => this.paraContrato(c))

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (c) =>
          normalizar(c.numero).includes(termo) ||
          normalizar(c.fornecedorNome).includes(termo) ||
          normalizar(c.notaFiscal).includes(termo),
      )
    }

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  async obter(empresaId: string, id: string) {
    const compra = await this.prisma.compra.findFirst({
      where: { id, empresaId },
      include: { fornecedor: true, itens: true },
    })
    if (!compra) throw new NotFoundException('Compra não encontrada.')
    return this.paraContrato(compra)
  }

  async resumo(empresaId: string) {
    const compras = await this.prisma.compra.findMany({
      where: { empresaId, status: StatusCompra.CONFIRMADA },
      select: { total: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    })

    const inicioMes = Date.now() - 30 * 86_400_000
    const doMes = compras.filter((c) => c.criadoEm.getTime() >= inicioMes)
    const totalMes = doMes.reduce((acc, c) => acc + numero(c.total), 0)

    return {
      totalMes: Number(totalMes.toFixed(2)),
      quantidadeMes: doMes.length,
      ticketMedio: doMes.length ? Number((totalMes / doMes.length).toFixed(2)) : 0,
      ultimaCompra: compras[0]?.criadoEm.toISOString() ?? null,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Confirmação — a única entrada de estoque do sistema               */
  /* ---------------------------------------------------------------- */

  /**
   * Confirmar a compra grava **quatro coisas que precisam valer juntas**:
   * o lote, o saldo no destino, o custo médio do produto e a movimentação
   * `ENTRADA`. Tudo em uma transação só.
   *
   * Se qualquer uma falhasse isolada, o estoque divergiria do histórico e
   * nenhum número da tela voltaria a ser confiável. É esta operação que
   * justificou escolher Postgres.
   */
  async confirmar(empresaId: string, usuario: string, entrada: EntradaCompraDto) {
    await this.validar(empresaId, entrada)

    const compraId = await this.nucleo.executar(async (tx) => {
      const [fornecedor, localDestino] = await Promise.all([
        tx.fornecedor.findFirst({ where: { id: entrada.fornecedorId, empresaId } }),
        tx.localEstoque.findFirst({ where: { id: entrada.localDestinoId, empresaId } }),
      ])
      if (!fornecedor) throw new ConflictException('Fornecedor não encontrado.')
      if (!localDestino) throw new ConflictException('Destino da entrada inválido.')

      const numeroCompra = await this.nucleo.proximoNumero(tx, empresaId, 'compra', 'CP', 1200)
      const agora = new Date()
      const nf = entrada.notaFiscal?.trim() ?? ''

      const subtotal = entrada.itens.reduce(
        (acc, i) => acc + i.quantidade * i.custoUnitario,
        0,
      )
      const total = subtotal + (entrada.frete ?? 0) - (entrada.desconto ?? 0)

      const compra = await tx.compra.create({
        data: {
          empresaId,
          numero: numeroCompra,
          fornecedorId: entrada.fornecedorId,
          notaFiscal: nf,
          dataEmissao: dataOuNulo(entrada.dataEmissao),
          dataEntrada: dataOuNulo(entrada.dataEntrada) ?? agora,
          condicaoPagamento: entrada.condicaoPagamento ?? '',
          formaPagamento: entrada.formaPagamento
            ? (entrada.formaPagamento.toUpperCase() as never)
            : null,
          dataVencimento: dataOuNulo(entrada.dataVencimento),
          observacoes: entrada.observacoes ?? '',
          frete: entrada.frete ?? 0,
          desconto: entrada.desconto ?? 0,
          subtotal: arredondar(subtotal),
          total: arredondar(total),
          localDestinoId: entrada.localDestinoId,
          status: StatusCompra.CONFIRMADA,
          confirmadaEm: agora,
        },
      })

      const carimbo = agora.toISOString().slice(2, 10).replace(/-/g, '')

      for (const [indice, item] of entrada.itens.entries()) {
        const codigoLote =
          item.lote?.trim() || `L${carimbo}${String.fromCharCode(65 + (indice % 26))}`

        // 1. o lote nasce da compra
        const lote = await tx.lote.create({
          data: {
            empresaId,
            codigo: codigoLote,
            produtoId: item.produtoId,
            compraId: compra.id,
            custoUnitario: item.custoUnitario,
            validade: dataOuNulo(item.validade),
          },
        })

        await tx.itemCompra.create({
          data: {
            compraId: compra.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            unidade: (item.unidade ?? 'un').toUpperCase() as never,
            custoUnitario: item.custoUnitario,
            validade: dataOuNulo(item.validade),
            lote: codigoLote,
            total: arredondar(item.quantidade * item.custoUnitario),
          },
        })

        // 2. o saldo entra no destino
        await this.nucleo.aplicarSaldo(tx, {
          empresaId,
          produtoId: item.produtoId,
          loteId: lote.id,
          localId: entrada.localDestinoId,
          delta: item.quantidade,
        })

        // 3. o custo médio é recalculado a partir dos lotes com saldo
        await this.nucleo.recalcularCusto(tx, item.produtoId)

        // 4. o fato fica registrado no histórico
        await this.nucleo.registrarMovimentacao(tx, {
          empresaId,
          tipo: TipoMovimentacao.ENTRADA,
          produtoId: item.produtoId,
          loteId: lote.id,
          quantidade: item.quantidade,
          origemId: null,
          origemLabel: fornecedor.nome,
          destinoId: entrada.localDestinoId,
          destinoLabel: localDestino.nome,
          usuario,
          observacao: nf ? `Compra NF ${nf}` : 'Compra registrada',
          documento: nf ? `NF ${nf}` : '',
          custoUnitario: item.custoUnitario,
          valorTotal: arredondar(item.quantidade * item.custoUnitario),
          data: agora,
        })
      }

      return compra.id
    })

    const compra = await this.obter(empresaId, compraId)
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: entrada.itens.map((i) => i.produtoId) } },
      select: { nome: true },
    })

    return {
      compra,
      lotesCriados: entrada.itens.length,
      itensAdicionados: entrada.itens.reduce((acc, i) => acc + i.quantidade, 0),
      produtosAfetados: produtos.map((p) => p.nome),
    }
  }

  /* ---------------------------------------------------------------- */
  /* Internos                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Nota fiscal, forma e condição de pagamento **não** são exigidas: são dados
   * fiscais úteis, não requisitos para dar entrada em mercadoria.
   */
  private async validar(empresaId: string, entrada: EntradaCompraDto) {
    if (!entrada.fornecedorId) throw new ConflictException('Selecione o fornecedor da compra.')
    if (!entrada.itens?.length) {
      throw new ConflictException('Adicione ao menos um produto à compra.')
    }

    const invalido = entrada.itens.find((i) => i.quantidade <= 0 || i.custoUnitario <= 0)
    if (invalido) {
      const produto = await this.prisma.produto.findFirst({
        where: { id: invalido.produtoId, empresaId },
        select: { nome: true },
      })
      throw new ConflictException(
        `Quantidade e custo devem ser maiores que zero em "${produto?.nome ?? 'item'}".`,
      )
    }

    // Produto de outra empresa não pode entrar numa compra desta.
    const ids = [...new Set(entrada.itens.map((i) => i.produtoId))]
    const encontrados = await this.prisma.produto.count({
      where: { empresaId, id: { in: ids } },
    })
    if (encontrados !== ids.length) {
      throw new ConflictException('Produto da compra não encontrado.')
    }
  }

  private paraContrato(
    compra: Prisma.CompraGetPayload<{ include: { fornecedor: true; itens: true } }>,
  ) {
    return {
      id: compra.id,
      numero: compra.numero,
      fornecedorId: compra.fornecedorId,
      fornecedorNome: compra.fornecedor?.nome ?? '—',
      notaFiscal: compra.notaFiscal,
      dataEmissao: compra.dataEmissao?.toISOString() ?? '',
      dataEntrada: compra.dataEntrada?.toISOString() ?? '',
      condicaoPagamento: compra.condicaoPagamento,
      formaPagamento: (compra.formaPagamento?.toLowerCase() ?? 'boleto') as never,
      dataVencimento: compra.dataVencimento?.toISOString() ?? '',
      observacoes: compra.observacoes,
      frete: numero(compra.frete),
      desconto: numero(compra.desconto),
      subtotal: numero(compra.subtotal),
      total: numero(compra.total),
      localDestinoId: compra.localDestinoId,
      status: compra.status.toLowerCase() as never,
      criadoEm: compra.criadoEm.toISOString(),
      itens: compra.itens.map((i) => ({
        id: i.id,
        produtoId: i.produtoId,
        quantidade: numero(i.quantidade),
        unidade: i.unidade.toLowerCase() as never,
        custoUnitario: numero(i.custoUnitario),
        validade: i.validade?.toISOString() ?? null,
        lote: i.lote,
        total: numero(i.total),
      })),
      totalItens: compra.itens.reduce((acc, i) => acc + numero(i.quantidade), 0),
    }
  }
}

function arredondar(valor: number): number {
  return Number(valor.toFixed(2))
}

function dataOuNulo(valor?: string | null): Date | null {
  if (!valor) return null
  const data = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor)
  return Number.isNaN(data.getTime()) ? null : data
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
