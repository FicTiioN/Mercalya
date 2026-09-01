import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { MotivoPerda, StatusProduto, TipoLocal, TipoMovimentacao } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NucleoEstoqueService } from './nucleo.service'
import { numero } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { AbastecerDto } from './dto/abastecer.dto'
import type { RegistrarPerdaDto } from './dto/registrar-perda.dto'
import type { AjustarSaldoDto } from './dto/ajustar-saldo.dto'
import type { ConsultaEstoqueDto } from './dto/consulta-estoque.dto'

const DIA_MS = 86_400_000

const ROTULOS_MOTIVO: Record<MotivoPerda, string> = {
  VENCIMENTO: 'Vencimento',
  QUEBRA: 'Quebra',
  AVARIA: 'Avaria',
  ROUBO: 'Roubo/Furto',
  ERRO_OPERACIONAL: 'Erro operacional',
  OUTROS: 'Outros',
}

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nucleo: NucleoEstoqueService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  async locais(empresaId: string) {
    const locais = await this.prisma.localEstoque.findMany({
      where: { empresaId },
      orderBy: { tipo: 'asc' },
    })
    return locais.map((l) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo.toLowerCase() as 'central' | 'loja',
      descricao: l.descricao,
      lojaId: l.lojaId,
    }))
  }

  /** Lotes com saldo, é a visão de "o que existe fisicamente". */
  async listarLotes(empresaId: string, consulta: ConsultaEstoqueDto) {
    const saldos = await this.prisma.saldoEstoque.findMany({
      where: {
        empresaId,
        ...(consulta.localId ? { localId: consulta.localId } : {}),
        quantidade: { gt: 0 },
      },
      include: {
        produto: { include: { categoria: true } },
        lote: true,
        local: true,
      },
    })

    const agora = Date.now()
    let itens = saldos.map((saldo) => {
      const validade = saldo.lote?.validade ?? null
      const dias = validade
        ? Math.ceil((validade.getTime() - agora) / DIA_MS)
        : null
      const quantidade = numero(saldo.quantidade)
      const reservado = numero(saldo.reservado)
      const custo = numero(saldo.lote?.custoUnitario ?? saldo.produto.custoMedio)

      return {
        saldoId: saldo.id,
        produtoId: saldo.produtoId,
        produtoNome: saldo.produto.nome,
        produtoImagem: saldo.produto.imagem,
        ean: saldo.produto.ean ?? '',
        categoriaNome: saldo.produto.categoria?.nome ?? '—',
        loteCodigo: saldo.lote?.codigo ?? '—',
        validade: validade?.toISOString() ?? null,
        diasParaVencer: dias,
        quantidade,
        reservado,
        disponivel: Math.max(0, quantidade - reservado),
        custoMedio: custo,
        valorTotal: Number((quantidade * custo).toFixed(2)),
        localId: saldo.localId,
        localNome: saldo.local.nome,
        posicao: saldo.produto.localizacaoPadrao,
        status: statusLote(dias),
      }
    })

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (i) =>
          normalizar(i.produtoNome).includes(termo) ||
          normalizar(i.ean).includes(termo) ||
          normalizar(i.loteCodigo).includes(termo),
      )
    }
    if (consulta.categoriaId && consulta.categoriaId !== 'todas') {
      const ids = saldos
        .filter((s) => s.produto.categoriaId === consulta.categoriaId)
        .map((s) => s.id)
      itens = itens.filter((i) => ids.includes(i.saldoId))
    }
    if (consulta.status && consulta.status !== 'todos') {
      itens = itens.filter((i) => i.status === consulta.status)
    }
    if (consulta.validade && consulta.validade !== 'todos') {
      itens = itens.filter((i) => {
        if (i.diasParaVencer === null) return false
        if (consulta.validade === 'vencidos') return i.diasParaVencer < 0
        return i.diasParaVencer >= 0 && i.diasParaVencer <= Number(consulta.validade)
      })
    }
    if (consulta.apenasComReserva === 'true') {
      itens = itens.filter((i) => i.reservado > 0)
    }

    itens.sort((a, b) => {
      if (consulta.ordenar === 'validade') {
        return (a.diasParaVencer ?? 99_999) - (b.diasParaVencer ?? 99_999)
      }
      if (consulta.ordenar === 'valor') return b.valorTotal - a.valorTotal
      if (consulta.ordenar === 'quantidade') return b.quantidade - a.quantidade
      return a.produtoNome.localeCompare(b.produtoNome, 'pt-BR')
    })

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  /**
   * KPIs do estoque central. Os deltas comparam com 30 dias atrás, somando o
   * que entrou e saiu no período — reconstruir o passado a partir das
   * movimentações é o que evita guardar um retrato diário só para isso.
   */
  async resumo(empresaId: string, localId?: string) {
    const local = localId ?? (await this.nucleo.localCentral(this.prisma, empresaId)).id

    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, localId: local, quantidade: { gt: 0 } },
      include: { lote: true, produto: true },
    })

    const agora = Date.now()
    let valorEstoque = 0
    let totalItens = 0
    let proximosVencer = 0

    for (const saldo of saldos) {
      const q = numero(saldo.quantidade)
      totalItens += q
      valorEstoque += q * numero(saldo.lote?.custoUnitario ?? saldo.produto.custoMedio)

      const validade = saldo.lote?.validade
      if (validade) {
        const dias = Math.ceil((validade.getTime() - agora) / DIA_MS)
        if (dias <= 30) proximosVencer += 1
      }
    }

    const sugestoes = await this.sugestoes(empresaId)
    const movimentado = await this.prisma.movimentacaoEstoque.aggregate({
      where: { empresaId, data: { gte: new Date(agora - 30 * DIA_MS) } },
      _sum: { quantidade: true },
    })
    const delta = numero(movimentado._sum.quantidade)
    const anterior = totalItens - delta

    return {
      totalItens,
      totalItensDelta: anterior > 0 ? (delta / anterior) * 100 : 0,
      valorEstoque: Number(valorEstoque.toFixed(2)),
      valorEstoqueDelta: 0,
      proximosVencer,
      proximosVencerDelta: 0,
      reposicaoLoja: sugestoes.length,
      reposicaoLojaDelta: 0,
    }
  }

  /**
   * Sugestão de abastecimento: produto abaixo do ideal na loja **e** com saldo
   * disponível no central. Sem as duas condições não há o que sugerir.
   */
  async sugestoes(empresaId: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const central = await this.nucleo.localCentral(this.prisma, empresaId)
    const localLoja = await this.prisma.localEstoque.findUnique({ where: { lojaId: loja } })

    const produtos = await this.prisma.produto.findMany({
      where: { empresaId, status: StatusProduto.ATIVO },
      include: { configuracoes: { where: { lojaId: loja } } },
    })

    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId', 'localId'],
      where: { empresaId },
      _sum: { quantidade: true },
    })

    const total = (produtoId: string, localId: string) =>
      numero(
        saldos.find((s) => s.produtoId === produtoId && s.localId === localId)?._sum.quantidade,
      )

    const lista = produtos
      .map((produto) => {
        const config = produto.configuracoes[0]
        if (!config || !config.ativo) return null

        const naLoja = localLoja ? total(produto.id, localLoja.id) : 0
        const noCentral = total(produto.id, central.id)
        const alvo = numero(config.estoqueIdeal)
        const faltando = alvo - naLoja
        if (faltando <= 0 || noCentral <= 0) return null

        const quantidade = Math.min(faltando, noCentral)
        const cobertura = alvo > 0 ? naLoja / alvo : 1

        return {
          produtoId: produto.id,
          produtoNome: produto.nome,
          produtoImagem: produto.imagem,
          quantidadeSugerida: quantidade,
          disponivelCentral: noCentral,
          motivo:
            naLoja === 0
              ? 'Sem estoque na loja'
              : cobertura < 0.25
                ? 'Alta demanda'
                : 'Reposição sugerida',
          valorEstimado: Number((quantidade * numero(produto.custoMedio)).toFixed(2)),
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    return lista.sort((a, b) => b.quantidadeSugerida - a.quantidadeSugerida)
  }

  async resumoSugestoes(empresaId: string) {
    const sugestoes = await this.sugestoes(empresaId)
    return {
      totalItens: sugestoes.reduce((acc, s) => acc + s.quantidadeSugerida, 0),
      valorEstimado: Number(sugestoes.reduce((acc, s) => acc + s.valorEstimado, 0).toFixed(2)),
      produtos: sugestoes.length,
    }
  }

  /** Cabeçalho do abastecimento: de onde sai e para onde vai. */
  async origemDestino(empresaId: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const central = await this.nucleo.localCentral(this.prisma, empresaId)
    const destino = await this.prisma.localEstoque.findUnique({ where: { lojaId: loja } })

    const soma = async (localId: string) =>
      numero(
        (
          await this.prisma.saldoEstoque.aggregate({
            where: { empresaId, localId },
            _sum: { quantidade: true },
          })
        )._sum.quantidade,
      )

    return {
      origemNome: central.nome,
      itensDisponiveis: await soma(central.id),
      destinoNome: destino?.nome ?? '—',
      itensNaLoja: destino ? await soma(destino.id) : 0,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Abastecimento — transferência, não criação                        */
  /* ---------------------------------------------------------------- */

  /**
   * Abastecer é **transferir**: o central diminui exatamente o que a loja
   * aumenta, e o total da empresa não muda. O retorno traz o total global antes
   * e depois justamente para tornar isso verificável.
   *
   * Consome por FEFO e recria o saldo lote a lote no destino — perder o vínculo
   * com o lote destruiria o controle de validade na prateleira.
   */
  async abastecer(empresaId: string, usuario: string, entrada: AbastecerDto) {
    if (!entrada.itens?.length) throw new ConflictException('Selecione ao menos um produto.')

    return this.nucleo.executar(async (tx) => {
      const central = await this.nucleo.localCentral(tx, empresaId)
      const lojaId = entrada.lojaId ?? (await this.lojaPadrao(empresaId))
      const destino = await tx.localEstoque.findFirst({
        where: { empresaId, lojaId, tipo: TipoLocal.LOJA },
      })
      if (!destino) throw new ConflictException('Loja de destino não encontrada.')

      const totalAntes = await this.nucleo.totalGlobal(tx, empresaId)

      // Valida tudo antes de mover: uma recusa no meio deixaria o usuário sem
      // saber quais itens passaram — mesmo com o rollback resolvendo o dado.
      for (const item of entrada.itens) {
        const produto = await tx.produto.findFirst({
          where: { id: item.produtoId, empresaId },
          select: { nome: true },
        })
        if (!produto) throw new ConflictException('Produto não encontrado.')
        if (item.quantidade <= 0) {
          throw new ConflictException(`Informe uma quantidade válida para "${produto.nome}".`)
        }
        const disponivel = await this.nucleo.disponivelNoLocal(tx, item.produtoId, central.id)
        if (item.quantidade > disponivel) {
          throw new ConflictException(
            `Estoque central insuficiente para "${produto.nome}" (disponível: ${disponivel}).`,
          )
        }
      }

      const numeroAbast = await this.nucleo.proximoNumero(tx, empresaId, 'abastecimento', 'AB', 1240)
      const agora = new Date()

      const abastecimento = await tx.abastecimento.create({
        data: {
          empresaId,
          numero: numeroAbast,
          origemId: central.id,
          destinoId: destino.id,
          totalProdutos: entrada.itens.length,
          totalItens: entrada.itens.reduce((acc, i) => acc + i.quantidade, 0),
          usuario,
          data: agora,
        },
      })

      for (const item of entrada.itens) {
        const consumidos = await this.nucleo.consumirFefo(tx, {
          produtoId: item.produtoId,
          localId: central.id,
          quantidade: item.quantidade,
        })

        for (const consumo of consumidos) {
          await this.nucleo.aplicarSaldo(tx, {
            empresaId,
            produtoId: item.produtoId,
            loteId: consumo.loteId,
            localId: destino.id,
            delta: consumo.quantidade,
          })

          await this.nucleo.registrarMovimentacao(tx, {
            empresaId,
            tipo: TipoMovimentacao.TRANSFERENCIA,
            produtoId: item.produtoId,
            loteId: consumo.loteId,
            quantidade: consumo.quantidade,
            origemId: central.id,
            origemLabel: central.nome,
            destinoId: destino.id,
            destinoLabel: destino.nome,
            usuario,
            observacao: 'Abastecimento',
            documento: '',
            custoUnitario: consumo.custoUnitario,
            valorTotal: Number((consumo.quantidade * consumo.custoUnitario).toFixed(2)),
            data: agora,
          })
        }

        await tx.itemAbastecimento.create({
          data: {
            abastecimentoId: abastecimento.id,
            produtoId: item.produtoId,
            loteId: null,
            quantidade: item.quantidade,
          },
        })
      }

      const totalDepois = await this.nucleo.totalGlobal(tx, empresaId)

      return {
        abastecimento: {
          id: abastecimento.id,
          numero: abastecimento.numero,
          origemId: central.id,
          destinoId: destino.id,
          destinoNome: destino.nome,
          totalProdutos: abastecimento.totalProdutos,
          totalItens: numero(abastecimento.totalItens),
          status: 'concluido' as const,
          usuario,
          data: agora.toISOString(),
          itens: [],
        },
        totalGlobalAntes: totalAntes,
        totalGlobalDepois: totalDepois,
      }
    })
  }

  async abastecimentosRecentes(empresaId: string, limite = 5) {
    const lista = await this.prisma.abastecimento.findMany({
      where: { empresaId },
      include: { destino: true, itens: true },
      orderBy: { data: 'desc' },
      take: limite,
    })

    return lista.map((a) => ({
      id: a.id,
      numero: a.numero,
      origemId: a.origemId,
      destinoId: a.destinoId,
      destinoNome: a.destino.nome,
      totalProdutos: a.totalProdutos,
      totalItens: numero(a.totalItens),
      status: a.status.toLowerCase() as 'concluido' | 'cancelado',
      usuario: a.usuario,
      data: a.data.toISOString(),
      itens: a.itens.map((i) => ({
        id: i.id,
        produtoId: i.produtoId,
        loteId: i.loteId,
        quantidade: numero(i.quantidade),
      })),
    }))
  }

  /** Produtos com saldo no central, para montar um abastecimento. */
  async produtosDisponiveis(empresaId: string, busca = '', lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const central = await this.nucleo.localCentral(this.prisma, empresaId)
    const localLoja = await this.prisma.localEstoque.findUnique({ where: { lojaId: loja } })

    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId', 'localId'],
      where: { empresaId, quantidade: { gt: 0 } },
      _sum: { quantidade: true },
    })

    const ids = [...new Set(saldos.filter((s) => s.localId === central.id).map((s) => s.produtoId))]
    if (ids.length === 0) return []

    const produtos = await this.prisma.produto.findMany({
      where: { empresaId, id: { in: ids }, status: StatusProduto.ATIVO },
      include: { configuracoes: { where: { lojaId: loja } }, categoria: true },
    })

    const termo = normalizar(busca.trim())
    return produtos
      .filter((p) => !termo || p.buscaTexto.includes(termo))
      .map((produto) => {
        const naLoja = localLoja
          ? numero(
              saldos.find((s) => s.produtoId === produto.id && s.localId === localLoja.id)?._sum
                .quantidade,
            )
          : 0
        const config = produto.configuracoes[0]

        return {
          produtoId: produto.id,
          nome: produto.nome,
          imagem: produto.imagem,
          categoriaNome: produto.categoria?.nome ?? '—',
          disponivelCentral: numero(
            saldos.find((s) => s.produtoId === produto.id && s.localId === central.id)?._sum
              .quantidade,
          ),
          naLoja,
          minimoLoja: config ? numero(config.estoqueMinimo) : 0,
          idealLoja: config ? numero(config.estoqueIdeal) : 0,
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  /* ---------------------------------------------------------------- */
  /* Perda — reduz o estoque e nunca volta                             */
  /* ---------------------------------------------------------------- */

  async registrarPerda(empresaId: string, usuario: string, entrada: RegistrarPerdaDto) {
    return this.nucleo.executar(async (tx) => {
      const [produto, local] = await Promise.all([
        tx.produto.findFirst({ where: { id: entrada.produtoId, empresaId } }),
        tx.localEstoque.findFirst({ where: { id: entrada.localId, empresaId } }),
      ])
      if (!produto) throw new ConflictException('Selecione o produto.')
      if (!local) throw new ConflictException('Selecione o local.')
      if (entrada.quantidade <= 0) {
        throw new ConflictException('Informe uma quantidade maior que zero.')
      }

      const disponivel = await this.nucleo.totalNoLocal(tx, entrada.produtoId, entrada.localId)
      if (entrada.quantidade > disponivel) {
        throw new ConflictException(
          `Quantidade maior que o saldo disponível (${disponivel} ${produto.unidade.toLowerCase()}).`,
        )
      }

      const consumidos = await this.nucleo.consumirFefo(tx, {
        produtoId: entrada.produtoId,
        localId: entrada.localId,
        quantidade: entrada.quantidade,
      })

      const valor = consumidos.reduce((acc, c) => acc + c.quantidade * c.custoUnitario, 0)
      const loteRef = consumidos[0]?.loteId ?? null
      const motivo = entrada.motivo.toUpperCase().replace(/-/g, '_') as MotivoPerda
      const quando = entrada.data ? new Date(`${entrada.data}T12:00:00`) : new Date()

      const perda = await tx.perdaEstoque.create({
        data: {
          empresaId,
          produtoId: entrada.produtoId,
          loteId: loteRef,
          localId: entrada.localId,
          motivo,
          quantidade: entrada.quantidade,
          valor: Number(valor.toFixed(2)),
          observacao: entrada.observacao ?? '',
          registradoPor: usuario,
          data: quando,
        },
      })

      const lote = loteRef ? await tx.lote.findUnique({ where: { id: loteRef } }) : null

      await this.nucleo.registrarMovimentacao(tx, {
        empresaId,
        tipo: TipoMovimentacao.PERDA,
        produtoId: entrada.produtoId,
        loteId: loteRef,
        // Negativa: no histórico, perda é saída.
        quantidade: -entrada.quantidade,
        origemId: entrada.localId,
        origemLabel: local.nome,
        destinoId: null,
        destinoLabel: '-',
        usuario,
        observacao: ROTULOS_MOTIVO[motivo],
        documento: lote?.codigo ?? '',
        custoUnitario: consumidos[0]?.custoUnitario ?? null,
        valorTotal: Number(valor.toFixed(2)),
        data: quando,
      })

      await this.nucleo.recalcularCusto(tx, entrada.produtoId)

      return {
        id: perda.id,
        produtoId: perda.produtoId,
        produtoNome: produto.nome,
        produtoImagem: produto.imagem,
        loteId: perda.loteId,
        localId: perda.localId,
        localNome: local.nome,
        motivo: entrada.motivo,
        motivoLabel: ROTULOS_MOTIVO[motivo],
        quantidade: numero(perda.quantidade),
        valor: numero(perda.valor),
        observacao: perda.observacao,
        registradoPor: perda.registradoPor,
        data: perda.data.toISOString(),
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /* Ajuste — corrige o saldo e deixa rastro                           */
  /* ---------------------------------------------------------------- */

  async ajustar(empresaId: string, usuario: string, entrada: AjustarSaldoDto) {
    return this.nucleo.executar(async (tx) => {
      const saldo = await tx.saldoEstoque.findFirst({
        where: { id: entrada.saldoId, empresaId },
        include: { lote: true, local: true },
      })
      if (!saldo) throw new NotFoundException('Saldo não encontrado.')
      if (entrada.novaQuantidade < 0) {
        throw new ConflictException('A quantidade não pode ser negativa.')
      }

      const atual = numero(saldo.quantidade)
      const delta = entrada.novaQuantidade - atual
      if (delta === 0) throw new ConflictException('A quantidade informada é igual à atual.')

      await tx.saldoEstoque.update({
        where: { id: saldo.id },
        data: { quantidade: entrada.novaQuantidade },
      })

      await this.nucleo.registrarMovimentacao(tx, {
        empresaId,
        tipo: TipoMovimentacao.AJUSTE,
        produtoId: saldo.produtoId,
        loteId: saldo.loteId,
        quantidade: delta,
        origemId: saldo.localId,
        origemLabel: saldo.local.nome,
        destinoId: null,
        destinoLabel: '-',
        usuario,
        observacao: entrada.motivo?.trim() || 'Ajuste de contagem',
        documento: saldo.lote?.codigo ?? '',
        custoUnitario: numero(saldo.lote?.custoUnitario) || null,
        valorTotal: null,
      })

      await this.nucleo.recalcularCusto(tx, saldo.produtoId)

      return { delta }
    })
  }

  /* ---------------------------------------------------------------- */

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

function statusLote(dias: number | null): 'disponivel' | 'atencao' | 'critico' {
  if (dias === null) return 'disponivel'
  if (dias <= 7) return 'critico'
  if (dias <= 30) return 'atencao'
  return 'disponivel'
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
