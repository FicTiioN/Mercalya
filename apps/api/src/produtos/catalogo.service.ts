import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { EntradaCategoriaDto, EntradaMarcaDto } from './dto/entrada-catalogo.dto'

/**
 * Categorias e marcas.
 *
 * Existiam só como leitura até aqui, e isso tornava uma conta nova inutilizável:
 * categoria é obrigatória no produto, e sem tela para criá-la o cliente travava
 * no primeiro cadastro. O CRUD fecha esse buraco.
 */
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------ categorias ---------------------------- */

  async listarCategorias(empresaId: string) {
    return this.prisma.categoria.findMany({
      where: { empresaId },
      select: { id: true, nome: true, cor: true, emoji: true },
      orderBy: { nome: 'asc' },
    })
  }

  /** Igual à listagem, mas com quanto cada categoria carrega — para a gestão. */
  async categoriasComUso(empresaId: string) {
    const categorias = await this.prisma.categoria.findMany({
      where: { empresaId },
      orderBy: { nome: 'asc' },
    })
    if (categorias.length === 0) return []

    const [produtos, fornecedores] = await Promise.all([
      this.prisma.produto.groupBy({
        by: ['categoriaId'],
        where: { empresaId },
        _count: { _all: true },
      }),
      this.prisma.fornecedor.groupBy({
        by: ['categoriaPrincipalId'],
        where: { empresaId },
        _count: { _all: true },
      }),
    ])

    return categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      emoji: c.emoji,
      totalProdutos: produtos.find((p) => p.categoriaId === c.id)?._count._all ?? 0,
      totalFornecedores:
        fornecedores.find((f) => f.categoriaPrincipalId === c.id)?._count._all ?? 0,
    }))
  }

  async criarCategoria(empresaId: string, entrada: EntradaCategoriaDto) {
    const nome = this.nomeValido(entrada.nome, 'categoria')
    await this.garantirNomeLivre(empresaId, 'categoria', nome)

    return this.prisma.categoria.create({
      data: {
        empresaId,
        nome,
        cor: entrada.cor?.trim() || '#087F73',
        emoji: entrada.emoji?.trim() ?? '',
      },
      select: { id: true, nome: true, cor: true, emoji: true },
    })
  }

  async atualizarCategoria(empresaId: string, id: string, entrada: EntradaCategoriaDto) {
    const atual = await this.prisma.categoria.findFirst({ where: { id, empresaId } })
    if (!atual) throw new NotFoundException('Categoria não encontrada.')

    const nome = this.nomeValido(entrada.nome, 'categoria')
    await this.garantirNomeLivre(empresaId, 'categoria', nome, id)

    return this.prisma.categoria.update({
      where: { id },
      data: {
        nome,
        cor: entrada.cor?.trim() || atual.cor,
        emoji: entrada.emoji?.trim() ?? atual.emoji,
      },
      select: { id: true, nome: true, cor: true, emoji: true },
    })
  }

  /**
   * Só remove categoria que ninguém usa.
   *
   * O banco já barra pela chave estrangeira, mas o erro cru não diz nada. Aqui
   * a resposta informa **quantos** registros dependem dela — sem isso o usuário
   * não sabe o que precisa mudar antes de tentar de novo.
   */
  async removerCategoria(empresaId: string, id: string) {
    const categoria = await this.prisma.categoria.findFirst({ where: { id, empresaId } })
    if (!categoria) throw new NotFoundException('Categoria não encontrada.')

    const [produtos, fornecedores] = await Promise.all([
      this.prisma.produto.count({ where: { empresaId, categoriaId: id } }),
      this.prisma.fornecedor.count({ where: { empresaId, categoriaPrincipalId: id } }),
    ])

    if (produtos > 0) {
      throw new ConflictException(
        `"${categoria.nome}" está em ${produtos} ${produtos === 1 ? 'produto' : 'produtos'}. Troque a categoria deles antes de excluir.`,
      )
    }
    if (fornecedores > 0) {
      throw new ConflictException(
        `"${categoria.nome}" está em ${fornecedores} ${fornecedores === 1 ? 'fornecedor' : 'fornecedores'}. Troque a categoria deles antes de excluir.`,
      )
    }

    await this.prisma.categoria.delete({ where: { id } })
  }

  /* -------------------------------- marcas ------------------------------ */

  async listarMarcas(empresaId: string) {
    return this.prisma.marca.findMany({
      where: { empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })
  }

  async marcasComUso(empresaId: string) {
    const marcas = await this.prisma.marca.findMany({
      where: { empresaId },
      orderBy: { nome: 'asc' },
    })
    if (marcas.length === 0) return []

    const produtos = await this.prisma.produto.groupBy({
      by: ['marcaId'],
      where: { empresaId, marcaId: { not: null } },
      _count: { _all: true },
    })

    return marcas.map((m) => ({
      id: m.id,
      nome: m.nome,
      totalProdutos: produtos.find((p) => p.marcaId === m.id)?._count._all ?? 0,
    }))
  }

  async criarMarca(empresaId: string, entrada: EntradaMarcaDto) {
    const nome = this.nomeValido(entrada.nome, 'marca')
    await this.garantirNomeLivre(empresaId, 'marca', nome)

    return this.prisma.marca.create({
      data: { empresaId, nome },
      select: { id: true, nome: true },
    })
  }

  async atualizarMarca(empresaId: string, id: string, entrada: EntradaMarcaDto) {
    const atual = await this.prisma.marca.findFirst({ where: { id, empresaId } })
    if (!atual) throw new NotFoundException('Marca não encontrada.')

    const nome = this.nomeValido(entrada.nome, 'marca')
    await this.garantirNomeLivre(empresaId, 'marca', nome, id)

    return this.prisma.marca.update({
      where: { id },
      data: { nome },
      select: { id: true, nome: true },
    })
  }

  /**
   * Marca em uso não é removida.
   *
   * A chave estrangeira é `SetNull` — o banco aceitaria e desvincularia os
   * produtos em silêncio. Apagar uma marca não deveria alterar produto nenhum
   * sem o usuário saber.
   */
  async removerMarca(empresaId: string, id: string) {
    const marca = await this.prisma.marca.findFirst({ where: { id, empresaId } })
    if (!marca) throw new NotFoundException('Marca não encontrada.')

    const produtos = await this.prisma.produto.count({ where: { empresaId, marcaId: id } })
    if (produtos > 0) {
      throw new ConflictException(
        `"${marca.nome}" está em ${produtos} ${produtos === 1 ? 'produto' : 'produtos'}. Troque a marca deles antes de excluir.`,
      )
    }

    await this.prisma.marca.delete({ where: { id } })
  }

  /* ------------------------------------------------------------------ */

  private nomeValido(nome: string | undefined, o: 'categoria' | 'marca'): string {
    const limpo = nome?.trim() ?? ''
    if (!limpo) throw new ConflictException(`Informe o nome da ${o}.`)
    return limpo
  }

  private async garantirNomeLivre(
    empresaId: string,
    tipo: 'categoria' | 'marca',
    nome: string,
    ignorarId?: string,
  ) {
    const where = {
      empresaId,
      nome: { equals: nome, mode: 'insensitive' as const },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    }

    const existente =
      tipo === 'categoria'
        ? await this.prisma.categoria.findFirst({ where })
        : await this.prisma.marca.findFirst({ where })

    if (existente) {
      throw new ConflictException(
        `Já existe ${tipo === 'categoria' ? 'uma categoria' : 'uma marca'} com o nome "${existente.nome}".`,
      )
    }
  }
}
