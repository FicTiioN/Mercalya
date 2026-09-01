import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, StatusProduto, TipoLocal } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { iso, numero, numeroOuNulo } from '../comum/numero'
import { normalizar, textoDeBusca } from '../comum/texto'
import type { ConsultaProdutosDto } from './dto/consulta-produtos.dto'
import type { EntradaProdutoDto } from './dto/entrada-produto.dto'
import type { SalvarConfiguracaoDto } from './dto/salvar-configuracao.dto'

const DIAS_SEM_GIRO = 30
const DIA_MS = 86_400_000

/**
 * Teto de produtos carregados para calcular os agregados de uma página.
 *
 * `estoqueTotal`, `estoqueBaixo` e `precoNaLoja` derivam de somas em
 * `saldo_estoque` e `configuracao_produto_loja` — SQL não filtra nem ordena
 * por eles sem uma consulta bem mais complexa. Para o porte da fatia, os
 * agregados são calculados em memória sobre o conjunto já filtrado por SQL.
 * O limite existe para que o custo disso seja explícito, e não uma surpresa
 * quando o catálogo crescer.
 */
const TETO_AGREGADOS = 5_000

type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: { categoria: true; marca: true }
}>

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  async listar(empresaId: string, consulta: ConsultaProdutosDto) {
    const lojaId = consulta.lojaId ?? (await this.lojaPadrao(empresaId))
    let itens = await this.montarLista(empresaId, lojaId, consulta)

    if (consulta.estoque && consulta.estoque !== 'todos') {
      itens = itens.filter((p) => {
        if (consulta.estoque === 'zerado') return p.estoqueTotal === 0
        if (consulta.estoque === 'baixo') return p.estoqueBaixo
        return !p.estoqueBaixo && p.estoqueTotal > 0
      })
    }

    const ordenar = consulta.ordenar ?? 'nome'
    itens.sort((a, b) => {
      if (ordenar === 'estoque') return b.estoqueTotal - a.estoqueTotal
      if (ordenar === 'preco') return (b.precoNaLoja ?? 0) - (a.precoNaLoja ?? 0)
      if (ordenar === 'recentes') return b.criadoEm.localeCompare(a.criadoEm)
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  async resumo(empresaId: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const itens = await this.montarLista(empresaId, loja, {})

    const total = itens.length
    const ativos = itens.filter((p) => p.status === 'ativo').length
    const estoqueBaixo = itens.filter((p) => p.estoqueBaixo).length
    const semGiro = itens.filter((p) => p.semGiro).length
    const agora = Date.now()
    const criadosUltimos30 = itens.filter(
      (p) => (agora - new Date(p.criadoEm).getTime()) / DIA_MS <= 30,
    ).length

    return {
      total,
      ativos,
      percentualAtivos: total ? (ativos / total) * 100 : 0,
      estoqueBaixo,
      percentualEstoqueBaixo: total ? (estoqueBaixo / total) * 100 : 0,
      semGiro,
      percentualSemGiro: total ? (semGiro / total) * 100 : 0,
      deltaTotal: total ? (criadosUltimos30 / total) * 100 : 0,
    }
  }

  async obter(empresaId: string, id: string, lojaId?: string) {
    const loja = lojaId ?? (await this.lojaPadrao(empresaId))
    const itens = await this.montarLista(empresaId, loja, {}, [id])
    const item = itens[0]
    if (!item) throw new NotFoundException('Produto não encontrado.')
    return item
  }

  async listarSimples(empresaId: string) {
    const lojaId = await this.lojaPadrao(empresaId)
    const itens = await this.montarLista(empresaId, lojaId, {})
    return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  /** Configuração por loja. Sem `produtoId`, devolve o padrão de cada loja. */
  async configuracoesPorLoja(empresaId: string, produtoId?: string) {
    const lojas = await this.prisma.loja.findMany({
      where: { empresaId, ativa: true },
      orderBy: { nome: 'asc' },
    })

    const produto = produtoId
      ? await this.prisma.produto.findFirst({ where: { id: produtoId, empresaId } })
      : null
    if (produtoId && !produto) throw new NotFoundException('Produto não encontrado.')

    const configs = produtoId
      ? await this.prisma.configuracaoProdutoLoja.findMany({ where: { produtoId } })
      : []

    const custoMedio = numeroOuNulo(produto?.custoMedio)

    return lojas.map((loja) => {
      const config = configs.find((c) => c.lojaId === loja.id)
      const precoVenda = config ? numero(config.precoVenda) : numero(produto?.precoSugerido)

      return {
        lojaId: loja.id,
        lojaNome: loja.nome,
        precoVenda,
        estoqueMinimo: config ? numero(config.estoqueMinimo) : 0,
        estoqueIdeal: config ? numero(config.estoqueIdeal) : 0,
        ativo: config ? config.ativo : true,
        margem:
          custoMedio && custoMedio > 0 && precoVenda > 0
            ? ((precoVenda - custoMedio) / precoVenda) * 100
            : null,
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /* Escrita                                                           */
  /* ---------------------------------------------------------------- */

  async criar(empresaId: string, entrada: EntradaProdutoDto) {
    await this.validar(empresaId, entrada)
    await this.garantirCodigosLivres(empresaId, entrada)

    const id = await this.prisma.$transaction(async (tx) => {
      const produto = await tx.produto.create({
        data: {
          ...this.camposDoProduto(entrada),
          empresaId,
          // Cadastrar produto NÃO cria estoque: nasce sem custo e sem saldo.
          // A primeira entrada vem da confirmação de uma compra.
          custoMedio: null,
        },
      })

      await tx.configuracaoProdutoLoja.createMany({
        data: entrada.configuracoesLoja.map((c) => ({
          produtoId: produto.id,
          lojaId: c.lojaId,
          precoVenda: c.precoVenda,
          estoqueMinimo: c.estoqueMinimo,
          estoqueIdeal: c.estoqueIdeal,
          ativo: c.ativo,
        })),
      })

      return produto.id
    })

    return this.obter(empresaId, id)
  }

  async atualizar(empresaId: string, id: string, entrada: EntradaProdutoDto) {
    const existente = await this.prisma.produto.findFirst({ where: { id, empresaId } })
    if (!existente) throw new NotFoundException('Produto não encontrado.')

    await this.validar(empresaId, entrada)
    await this.garantirCodigosLivres(empresaId, entrada, id)

    await this.prisma.$transaction(async (tx) => {
      await tx.produto.update({
        where: { id },
        data: this.camposDoProduto(entrada),
      })

      for (const c of entrada.configuracoesLoja) {
        await tx.configuracaoProdutoLoja.upsert({
          where: { produtoId_lojaId: { produtoId: id, lojaId: c.lojaId } },
          create: {
            produtoId: id,
            lojaId: c.lojaId,
            precoVenda: c.precoVenda,
            estoqueMinimo: c.estoqueMinimo,
            estoqueIdeal: c.estoqueIdeal,
            ativo: c.ativo,
          },
          update: {
            precoVenda: c.precoVenda,
            estoqueMinimo: c.estoqueMinimo,
            estoqueIdeal: c.estoqueIdeal,
            ativo: c.ativo,
          },
        })
      }
    })

    return this.obter(empresaId, id)
  }

  async alternarStatus(empresaId: string, id: string) {
    const produto = await this.prisma.produto.findFirst({ where: { id, empresaId } })
    if (!produto) throw new NotFoundException('Produto não encontrado.')

    await this.prisma.produto.update({
      where: { id },
      data: {
        status:
          produto.status === StatusProduto.ATIVO ? StatusProduto.INATIVO : StatusProduto.ATIVO,
      },
    })

    return this.obter(empresaId, id)
  }

  async salvarConfiguracaoLoja(
    empresaId: string,
    produtoId: string,
    lojaId: string,
    entrada: SalvarConfiguracaoDto,
  ) {
    const produto = await this.prisma.produto.findFirst({ where: { id: produtoId, empresaId } })
    if (!produto) throw new NotFoundException('Produto não encontrado.')

    const loja = await this.prisma.loja.findFirst({ where: { id: lojaId, empresaId } })
    if (!loja) throw new NotFoundException('Loja não encontrada.')

    if (entrada.ativo && entrada.precoVenda <= 0) {
      throw new ConflictException('Informe um preço de venda maior que zero.')
    }
    if (entrada.estoqueMinimo < 0) {
      throw new ConflictException('O estoque mínimo não pode ser negativo.')
    }

    // Desativar com mercadoria na prateleira deixaria saldo órfão: some da
    // tela de venda mas continua contando no estoque.
    if (!entrada.ativo) {
      const local = await this.prisma.localEstoque.findUnique({ where: { lojaId } })
      if (local) {
        const saldo = await this.prisma.saldoEstoque.aggregate({
          where: { produtoId, localId: local.id },
          _sum: { quantidade: true },
        })
        const quantidade = numero(saldo._sum.quantidade)
        if (quantidade > 0) {
          throw new ConflictException(
            `Ainda há ${quantidade} un deste produto na loja. Retire da loja antes de parar de vendê-lo.`,
          )
        }
      }
    }

    await this.prisma.configuracaoProdutoLoja.upsert({
      where: { produtoId_lojaId: { produtoId, lojaId } },
      create: {
        produtoId,
        lojaId,
        precoVenda: entrada.precoVenda,
        estoqueMinimo: entrada.estoqueMinimo,
        estoqueIdeal: entrada.estoqueIdeal ?? entrada.estoqueMinimo,
        ativo: entrada.ativo,
      },
      update: {
        precoVenda: entrada.precoVenda,
        estoqueMinimo: entrada.estoqueMinimo,
        ...(entrada.estoqueIdeal !== undefined ? { estoqueIdeal: entrada.estoqueIdeal } : {}),
        ativo: entrada.ativo,
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Internos                                                          */
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

  /**
   * Monta os `ProdutoListItem`. Os filtros que o SQL resolve ficam no `where`;
   * os agregados vêm de dois `groupBy` — nunca uma consulta por produto.
   */
  private async montarLista(
    empresaId: string,
    lojaId: string,
    consulta: ConsultaProdutosDto,
    ids?: string[],
  ) {
    const where: Prisma.ProdutoWhereInput = { empresaId }

    if (ids) where.id = { in: ids }
    if (consulta.busca?.trim()) {
      where.buscaTexto = { contains: normalizar(consulta.busca.trim()) }
    }
    if (consulta.categoriaId && consulta.categoriaId !== 'todas') {
      where.categoriaId = consulta.categoriaId
    }
    if (consulta.status && consulta.status !== 'todos') {
      where.status = consulta.status === 'ativo' ? StatusProduto.ATIVO : StatusProduto.INATIVO
    }

    const produtos: ProdutoComRelacoes[] = await this.prisma.produto.findMany({
      where,
      include: { categoria: true, marca: true },
      take: TETO_AGREGADOS,
    })
    if (produtos.length === 0) return []

    const produtoIds = produtos.map((p) => p.id)

    const [saldos, configs, locais] = await Promise.all([
      this.prisma.saldoEstoque.groupBy({
        by: ['produtoId', 'localId'],
        where: { empresaId, produtoId: { in: produtoIds } },
        _sum: { quantidade: true },
      }),
      this.prisma.configuracaoProdutoLoja.findMany({
        where: { produtoId: { in: produtoIds } },
      }),
      this.prisma.localEstoque.findMany({
        where: { empresaId },
        select: { id: true, tipo: true, lojaId: true },
      }),
    ])

    const centralIds = new Set(
      locais.filter((l) => l.tipo === TipoLocal.CENTRAL).map((l) => l.id),
    )
    const localDaLoja = locais.find((l) => l.lojaId === lojaId)?.id ?? null

    const agora = Date.now()

    return produtos.map((produto) => {
      const meus = saldos.filter((s) => s.produtoId === produto.id)
      const estoqueCentral = meus
        .filter((s) => centralIds.has(s.localId))
        .reduce((acc, s) => acc + numero(s._sum.quantidade), 0)
      const estoqueLoja = meus
        .filter((s) => s.localId === localDaLoja)
        .reduce((acc, s) => acc + numero(s._sum.quantidade), 0)

      const meusConfigs = configs.filter((c) => c.produtoId === produto.id)
      const ativas = meusConfigs.filter((c) => c.ativo)
      const precos = new Set(ativas.map((c) => numero(c.precoVenda)))
      const daLoja = meusConfigs.find((c) => c.lojaId === lojaId)

      const pontoCompra = numero(produto.pontoCompra)
      const ultimaVendaEm = iso(produto.ultimaVendaEm)

      return {
        id: produto.id,
        nome: produto.nome,
        ean: produto.ean ?? '',
        sku: produto.sku ?? '',
        categoriaId: produto.categoriaId,
        marcaId: produto.marcaId,
        unidade: produto.unidade.toLowerCase(),
        conteudo: produto.conteudo,
        precoSugerido: numero(produto.precoSugerido),
        custoMedio: numeroOuNulo(produto.custoMedio),
        pontoCompra,
        estoqueMaximoCentral: numero(produto.estoqueMaximoCentral),
        controleValidade: produto.controleValidade.toLowerCase().replace(/_/g, '-'),
        validadePadraoDias: produto.validadePadraoDias,
        localizacaoPadrao: produto.localizacaoPadrao,
        fornecedorPrincipalId: produto.fornecedorPrincipalId,
        observacoes: produto.observacoes,
        imagem: produto.imagem,
        status: produto.status.toLowerCase(),
        criadoEm: produto.criadoEm.toISOString(),
        ultimaVendaEm,

        categoriaNome: produto.categoria?.nome ?? '—',
        marcaNome: produto.marca?.nome ?? null,
        estoqueTotal: estoqueCentral + estoqueLoja,
        estoqueCentral,
        estoqueLoja,
        semGiro: ultimaVendaEm
          ? (agora - new Date(ultimaVendaEm).getTime()) / DIA_MS > DIAS_SEM_GIRO
          : true,
        // "Estoque baixo" no catálogo é sobre recompra: compara o central com
        // o ponto de compra. O mínimo da prateleira é outra pergunta.
        estoqueBaixo: estoqueCentral < pontoCompra,
        precoNaLoja: daLoja && daLoja.ativo ? numero(daLoja.precoVenda) : null,
        precosVariam: precos.size > 1,
        lojasAtivas: ativas.length,
      }
    })
  }

  private camposDoProduto(entrada: EntradaProdutoDto) {
    return {
      nome: entrada.nome.trim(),
      ean: entrada.ean?.trim() || null,
      sku: entrada.sku?.trim() || null,
      categoriaId: entrada.categoriaId,
      marcaId: entrada.marcaId ?? null,
      unidade: paraEnum(entrada.unidade),
      conteudo: entrada.conteudo ?? '',
      precoSugerido: entrada.precoSugerido ?? 0,
      pontoCompra: entrada.pontoCompra ?? 0,
      estoqueMaximoCentral: entrada.estoqueMaximoCentral ?? 0,
      controleValidade: paraEnum(entrada.controleValidade ?? 'por-lote'),
      validadePadraoDias: entrada.validadePadraoDias ?? null,
      localizacaoPadrao: entrada.localizacaoPadrao ?? '',
      fornecedorPrincipalId: entrada.fornecedorPrincipalId ?? null,
      observacoes: entrada.observacoes ?? '',
      imagem: entrada.imagem ?? '',
      buscaTexto: textoDeBusca({
        nome: entrada.nome,
        ean: entrada.ean,
        sku: entrada.sku,
      }),
    } as Prisma.ProdutoUncheckedCreateInput
  }

  private async validar(empresaId: string, entrada: EntradaProdutoDto) {
    if (!entrada.nome.trim()) throw new ConflictException('Informe o nome do produto.')
    if (!entrada.categoriaId) throw new ConflictException('Selecione uma categoria.')

    const categoria = await this.prisma.categoria.findFirst({
      where: { id: entrada.categoriaId, empresaId },
    })
    if (!categoria) throw new ConflictException('Categoria inválida.')

    const ativas = entrada.configuracoesLoja.filter((c) => c.ativo)
    if (ativas.length === 0) {
      throw new ConflictException('Ative o produto em ao menos uma loja para poder vendê-lo.')
    }

    const semPreco = ativas.find((c) => c.precoVenda <= 0)
    if (semPreco) {
      const loja = await this.prisma.loja.findFirst({
        where: { id: semPreco.lojaId, empresaId },
      })
      throw new ConflictException(`Informe o preço de venda em "${loja?.nome ?? 'loja'}".`)
    }
  }

  /**
   * EAN e SKU identificam o produto. O banco já barra a duplicata, mas o erro
   * cru do Prisma não diz nada ao lojista — aqui vira mensagem de negócio.
   */
  private async garantirCodigosLivres(
    empresaId: string,
    entrada: EntradaProdutoDto,
    ignorarId?: string,
  ) {
    const ean = entrada.ean?.trim()
    const sku = entrada.sku?.trim()

    if (ean) {
      const existente = await this.prisma.produto.findFirst({
        where: { empresaId, ean, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      })
      if (existente) {
        throw new ConflictException(`O EAN ${ean} já está em uso por "${existente.nome}".`)
      }
    }

    if (sku) {
      const existente = await this.prisma.produto.findFirst({
        where: { empresaId, sku, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      })
      if (existente) {
        throw new ConflictException(`O código ${sku} já está em uso por "${existente.nome}".`)
      }
    }
  }
}

/** `por-lote` -> `POR_LOTE`, `un` -> `UN`. */
function paraEnum<T>(valor: string): T {
  return valor.toUpperCase().replace(/-/g, '_') as T
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
