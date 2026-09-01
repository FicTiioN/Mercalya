import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Fornecedor, Prisma, StatusCompra, StatusFornecedor } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { numero } from '../comum/numero'
import { normalizar, textoDeBuscaFornecedor } from '../comum/texto'
import type { ConsultaFornecedoresDto } from './dto/consulta-fornecedores.dto'
import type { EntradaFornecedorDto } from './dto/entrada-fornecedor.dto'

const DIA_MS = 86_400_000
const DIAS_SEM_MOVIMENTACAO = 60

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  async listar(empresaId: string, consulta: ConsultaFornecedoresDto) {
    const where: Prisma.FornecedorWhereInput = { empresaId }

    if (consulta.busca?.trim()) {
      where.buscaTexto = { contains: normalizar(consulta.busca.trim()) }
    }
    if (consulta.status && consulta.status !== 'todos') {
      where.status =
        consulta.status === 'ativo' ? StatusFornecedor.ATIVO : StatusFornecedor.INATIVO
    }
    if (consulta.categoriaId && consulta.categoriaId !== 'todas') {
      where.categoriaPrincipalId = consulta.categoriaId
    }

    const itens = await this.montarLista(empresaId, where)

    // Fornecedor com compra mais recente primeiro; quem nunca comprou vai ao fim.
    itens.sort((a, b) => (b.ultimaCompra ?? '').localeCompare(a.ultimaCompra ?? ''))

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  async resumo(empresaId: string) {
    const itens = await this.montarLista(empresaId, { empresaId })

    const agora = Date.now()
    const semanaAtras = new Date(agora - 7 * DIA_MS)
    const duasSemanas = new Date(agora - 14 * DIA_MS)

    const [somaSemana, somaSemanaAnterior] = await Promise.all([
      this.prisma.compra.aggregate({
        where: { empresaId, status: StatusCompra.CONFIRMADA, criadoEm: { gte: semanaAtras } },
        _sum: { total: true },
      }),
      this.prisma.compra.aggregate({
        where: {
          empresaId,
          status: StatusCompra.CONFIRMADA,
          criadoEm: { gte: duasSemanas, lt: semanaAtras },
        },
        _sum: { total: true },
      }),
    ])

    const comprasSemana = numero(somaSemana._sum.total)
    const anterior = numero(somaSemanaAnterior._sum.total)

    const total = itens.length
    const ativos = itens.filter((f) => f.status === 'ativo').length

    return {
      total,
      ativos,
      percentualAtivos: total ? (ativos / total) * 100 : 0,
      novosNoMes: itens.filter(
        (f) => (agora - new Date(f.criadoEm).getTime()) / DIA_MS <= 30,
      ).length,
      comprasSemana,
      comprasSemanaDelta: anterior ? ((comprasSemana - anterior) / anterior) * 100 : 0,
      semMovimentacao: itens.filter(
        (f) =>
          !f.ultimaCompra ||
          (agora - new Date(f.ultimaCompra).getTime()) / DIA_MS > DIAS_SEM_MOVIMENTACAO,
      ).length,
    }
  }

  async obter(empresaId: string, id: string) {
    const itens = await this.montarLista(empresaId, { empresaId, id })
    const item = itens[0]
    if (!item) throw new NotFoundException('Fornecedor não encontrado.')
    return item
  }

  /** Só os ativos: quem não fornece mais não deve aparecer numa compra nova. */
  async listarSimples(empresaId: string) {
    const fornecedores = await this.prisma.fornecedor.findMany({
      where: { empresaId, status: StatusFornecedor.ATIVO },
      orderBy: { nome: 'asc' },
    })
    return fornecedores.map((f) => this.paraContrato(f))
  }

  /** Vazio para fornecedor recém-criado — a tela mostra o empty state. */
  async produtosFornecidos(empresaId: string, id: string) {
    await this.garantirExiste(empresaId, id)

    const produtos = await this.prisma.produto.findMany({
      where: { empresaId, fornecedorPrincipalId: id },
      include: { categoria: true },
      orderBy: { nome: 'asc' },
      take: 8,
    })
    if (produtos.length === 0) return []

    const saldos = await this.prisma.saldoEstoque.groupBy({
      by: ['produtoId'],
      where: { empresaId, produtoId: { in: produtos.map((p) => p.id) } },
      _sum: { quantidade: true },
    })

    return produtos.map((produto) => ({
      produtoId: produto.id,
      nome: produto.nome,
      imagem: produto.imagem,
      categoriaNome: produto.categoria?.nome ?? '—',
      quantidade: numero(saldos.find((s) => s.produtoId === produto.id)?._sum.quantidade),
    }))
  }

  /** Vazio para fornecedor recém-criado — a tela mostra o empty state. */
  async ultimasCompras(empresaId: string, id: string) {
    await this.garantirExiste(empresaId, id)

    const compras = await this.prisma.compra.findMany({
      where: { empresaId, fornecedorId: id },
      orderBy: { criadoEm: 'desc' },
      take: 6,
    })

    return compras.map((compra) => ({
      compraId: compra.id,
      numero: compra.numero,
      data: compra.dataEntrada?.toISOString() ?? compra.criadoEm.toISOString(),
      total: numero(compra.total),
      status:
        compra.status === StatusCompra.CONFIRMADA
          ? ('entregue' as const)
          : ('em-andamento' as const),
    }))
  }

  /* ---------------------------------------------------------------- */
  /* Escrita                                                           */
  /* ---------------------------------------------------------------- */

  async criar(empresaId: string, entrada: EntradaFornecedorDto) {
    this.validar(entrada)
    if (entrada.categoriaPrincipalId) {
      await this.garantirCategoria(empresaId, entrada.categoriaPrincipalId)
    }
    await this.garantirDocumentoLivre(empresaId, entrada.documento ?? '')

    const criado = await this.prisma.fornecedor.create({
      data: { ...this.campos(entrada), empresaId },
    })

    return this.obter(empresaId, criado.id)
  }

  /**
   * Atualização parcial: a tela de edição envia o formulário inteiro, mas o
   * contrato aceita `Partial`. Campo ausente é campo não alterado.
   */
  async atualizar(empresaId: string, id: string, entrada: Partial<EntradaFornecedorDto>) {
    const atual = await this.garantirExiste(empresaId, id)

    if (entrada.nome !== undefined && !entrada.nome.trim()) {
      throw new ConflictException('Informe o nome do fornecedor.')
    }
    if (entrada.categoriaPrincipalId) {
      await this.garantirCategoria(empresaId, entrada.categoriaPrincipalId)
    }
    if (entrada.documento !== undefined) {
      await this.garantirDocumentoLivre(empresaId, entrada.documento, id)
    }

    const dados = this.campos({
      nome: entrada.nome ?? atual.nome,
      nomeFantasia: entrada.nomeFantasia ?? atual.nomeFantasia,
      documento: entrada.documento ?? atual.documento ?? '',
      categoriaPrincipalId: entrada.categoriaPrincipalId ?? atual.categoriaPrincipalId ?? '',
      contato: entrada.contato ?? {
        nome: atual.contatoNome,
        cargo: atual.contatoCargo,
        telefone: atual.contatoTelefone,
        whatsapp: atual.contatoWhatsapp,
        email: atual.contatoEmail,
      },
      endereco: entrada.endereco ?? {
        cep: atual.enderecoCep,
        logradouro: atual.enderecoLogradouro,
        numero: atual.enderecoNumero,
        complemento: atual.enderecoComplemento,
        bairro: atual.enderecoBairro,
        cidade: atual.enderecoCidade,
        uf: atual.enderecoUf,
      },
      comercial: entrada.comercial ?? {
        prazoEntregaDias: atual.prazoEntregaDias,
        condicaoPagamento: atual.condicaoPagamento,
        descontoPadrao: numero(atual.descontoPadrao),
      },
      observacoes: entrada.observacoes ?? atual.observacoes,
      status: entrada.status ?? (atual.status === StatusFornecedor.ATIVO ? 'ativo' : 'inativo'),
    })

    await this.prisma.fornecedor.update({ where: { id }, data: dados })
    return this.obter(empresaId, id)
  }

  async alternarStatus(empresaId: string, id: string) {
    const atual = await this.garantirExiste(empresaId, id)

    await this.prisma.fornecedor.update({
      where: { id },
      data: {
        status:
          atual.status === StatusFornecedor.ATIVO
            ? StatusFornecedor.INATIVO
            : StatusFornecedor.ATIVO,
      },
    })

    return this.obter(empresaId, id)
  }

  /* ---------------------------------------------------------------- */
  /* Internos                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Agregados (`totalProdutos`, `totalCompras`, `valorCompras12m`,
   * `ultimaCompra`) resolvidos com dois `groupBy` — nunca uma consulta por
   * fornecedor.
   */
  private async montarLista(empresaId: string, where: Prisma.FornecedorWhereInput) {
    const fornecedores = await this.prisma.fornecedor.findMany({
      where,
      include: { categoriaPrincipal: true },
    })
    if (fornecedores.length === 0) return []

    const ids = fornecedores.map((f) => f.id)
    const limite12m = new Date(Date.now() - 365 * DIA_MS)

    const [produtos, compras, compras12m] = await Promise.all([
      this.prisma.produto.groupBy({
        by: ['fornecedorPrincipalId'],
        where: { empresaId, fornecedorPrincipalId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.compra.groupBy({
        by: ['fornecedorId'],
        where: { empresaId, fornecedorId: { in: ids }, status: StatusCompra.CONFIRMADA },
        _count: { _all: true },
        _max: { dataEntrada: true },
      }),
      this.prisma.compra.groupBy({
        by: ['fornecedorId'],
        where: {
          empresaId,
          fornecedorId: { in: ids },
          status: StatusCompra.CONFIRMADA,
          criadoEm: { gte: limite12m },
        },
        _sum: { total: true },
      }),
    ])

    return fornecedores.map((fornecedor) => {
      const compra = compras.find((c) => c.fornecedorId === fornecedor.id)
      const valor = compras12m.find((c) => c.fornecedorId === fornecedor.id)

      return {
        ...this.paraContrato(fornecedor),
        categoriaNome: fornecedor.categoriaPrincipal?.nome ?? '—',
        totalProdutos:
          produtos.find((p) => p.fornecedorPrincipalId === fornecedor.id)?._count._all ?? 0,
        totalCompras: compra?._count._all ?? 0,
        valorCompras12m: numero(valor?._sum.total),
        ultimaCompra: compra?._max.dataEntrada?.toISOString() ?? null,
      }
    })
  }

  /** Colunas planas do banco de volta ao formato aninhado do contrato. */
  private paraContrato(f: Fornecedor) {
    return {
      id: f.id,
      nome: f.nome,
      nomeFantasia: f.nomeFantasia,
      documento: f.documento ?? '',
      categoriaPrincipalId: f.categoriaPrincipalId ?? '',
      contato: {
        nome: f.contatoNome,
        cargo: f.contatoCargo,
        telefone: f.contatoTelefone,
        whatsapp: f.contatoWhatsapp,
        email: f.contatoEmail,
      },
      endereco: {
        cep: f.enderecoCep,
        logradouro: f.enderecoLogradouro,
        numero: f.enderecoNumero,
        complemento: f.enderecoComplemento,
        bairro: f.enderecoBairro,
        cidade: f.enderecoCidade,
        uf: f.enderecoUf,
      },
      comercial: {
        prazoEntregaDias: f.prazoEntregaDias,
        condicaoPagamento: f.condicaoPagamento,
        descontoPadrao: numero(f.descontoPadrao),
      },
      observacoes: f.observacoes,
      status: f.status.toLowerCase() as 'ativo' | 'inativo',
      criadoEm: f.criadoEm.toISOString(),
    }
  }

  private campos(entrada: EntradaFornecedorDto) {
    return {
      nome: entrada.nome.trim(),
      nomeFantasia: entrada.nomeFantasia?.trim() ?? '',
      documento: entrada.documento?.trim() || null,
      categoriaPrincipalId: entrada.categoriaPrincipalId || null,
      contatoNome: entrada.contato?.nome ?? '',
      contatoCargo: entrada.contato?.cargo ?? '',
      contatoTelefone: entrada.contato?.telefone ?? '',
      contatoWhatsapp: entrada.contato?.whatsapp ?? '',
      contatoEmail: entrada.contato?.email ?? '',
      enderecoCep: entrada.endereco?.cep ?? '',
      enderecoLogradouro: entrada.endereco?.logradouro ?? '',
      enderecoNumero: entrada.endereco?.numero ?? '',
      enderecoComplemento: entrada.endereco?.complemento ?? '',
      enderecoBairro: entrada.endereco?.bairro ?? '',
      enderecoCidade: entrada.endereco?.cidade ?? '',
      enderecoUf: entrada.endereco?.uf ?? '',
      prazoEntregaDias: entrada.comercial?.prazoEntregaDias ?? 0,
      condicaoPagamento: entrada.comercial?.condicaoPagamento ?? '',
      descontoPadrao: entrada.comercial?.descontoPadrao ?? 0,
      observacoes: entrada.observacoes ?? '',
      status: entrada.status === 'inativo' ? StatusFornecedor.INATIVO : StatusFornecedor.ATIVO,
      buscaTexto: textoDeBuscaFornecedor(entrada),
    }
  }

  /**
   * Só o nome é obrigatório — nenhum outro campo do fornecedor participa de
   * regra de negócio. Documento e categoria continuam sendo **validados quando
   * informados** (unicidade e existência), o que é diferente de exigi-los.
   */
  private validar(entrada: EntradaFornecedorDto) {
    if (!entrada.nome?.trim()) throw new ConflictException('Informe o nome do fornecedor.')
  }

  private async garantirExiste(empresaId: string, id: string) {
    const fornecedor = await this.prisma.fornecedor.findFirst({ where: { id, empresaId } })
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado.')
    return fornecedor
  }

  private async garantirCategoria(empresaId: string, categoriaId: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id: categoriaId, empresaId },
    })
    if (!categoria) throw new ConflictException('Categoria inválida.')
  }

  /** O banco já barra pelo índice único; aqui vira mensagem de negócio. */
  private async garantirDocumentoLivre(empresaId: string, documento: string, ignorarId?: string) {
    const alvo = documento.trim()
    if (!alvo) return

    const existente = await this.prisma.fornecedor.findFirst({
      where: { empresaId, documento: alvo, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    })
    if (existente) {
      throw new ConflictException('Já existe um fornecedor com este documento.')
    }
  }
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
