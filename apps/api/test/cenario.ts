import { randomUUID } from 'node:crypto'
import { Test, type TestingModule } from '@nestjs/testing'
import { TipoLocal, type TipoMovimentacao } from '@prisma/client'
import { PrismaModule } from '../src/prisma/prisma.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { EstoqueModule } from '../src/estoque/estoque.module'
import { NucleoEstoqueService } from '../src/estoque/nucleo.service'
import { EstoqueService } from '../src/estoque/estoque.service'
import { ComprasModule } from '../src/compras/compras.module'
import { ComprasService } from '../src/compras/compras.service'
import { VendasModule } from '../src/vendas/vendas.module'
import { VendasService } from '../src/vendas/vendas.service'
import { ProvedorSimulado } from '../src/pagamentos/simulado/provedor-simulado'
import type { ItemCompraDto } from '../src/compras/dto/entrada-compra.dto'
import type { AbrirVendaDto, RegistrarVendaDto } from '../src/vendas/dto/registrar-venda.dto'
import type { NovoPagamentoDto } from '../src/vendas/dto/novo-pagamento.dto'

export const OPERADOR = 'Teste'

/** Data no formato que os DTOs aceitam, N dias a partir de hoje. */
export function daqui(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Uma empresa nova por cenário.
 *
 * É o isolamento que o próprio modelo oferece: toda consulta é filtrada por
 * `empresaId`, então dois arquivos de teste rodando em paralelo no mesmo
 * banco não se veem. Não há truncate entre testes — se um teste enxergasse
 * dado de outro, isso seria um vazamento de tenant, e é exatamente o que a
 * suíte deve pegar.
 */
export class Cenario {
  private constructor(
    private readonly modulo: TestingModule,
    readonly prisma: PrismaService,
    readonly nucleo: NucleoEstoqueService,
    readonly estoque: EstoqueService,
    readonly compras: ComprasService,
    readonly vendas: VendasService,
    readonly simulado: ProvedorSimulado,
    readonly empresaId: string,
    readonly lojaId: string,
    readonly centralId: string,
    readonly localLojaId: string,
    readonly fornecedorId: string,
    readonly categoriaId: string,
  ) {}

  static async montar(): Promise<Cenario> {
    const modulo = await Test.createTestingModule({
      imports: [PrismaModule, EstoqueModule, ComprasModule, VendasModule],
    }).compile()

    const prisma = modulo.get(PrismaService)
    const sufixo = randomUUID().slice(0, 8)

    // Terminal simulado responde na primeira consulta — o teste não espera 3s.
    const simulado = modulo.get(ProvedorSimulado)
    simulado.configurar({ atrasoMs: 0 })

    const empresa = await prisma.empresa.create({ data: { nome: `Teste ${sufixo}` } })
    const loja = await prisma.loja.create({
      data: { empresaId: empresa.id, nome: 'Loja de teste' },
    })
    const central = await prisma.localEstoque.create({
      data: { empresaId: empresa.id, nome: 'Central', tipo: TipoLocal.CENTRAL },
    })
    const localLoja = await prisma.localEstoque.create({
      data: { empresaId: empresa.id, nome: 'Prateleira', tipo: TipoLocal.LOJA, lojaId: loja.id },
    })
    const fornecedor = await prisma.fornecedor.create({
      data: { empresaId: empresa.id, nome: 'Fornecedor de teste' },
    })
    const categoria = await prisma.categoria.create({
      data: { empresaId: empresa.id, nome: 'Geral' },
    })

    return new Cenario(
      modulo,
      prisma,
      modulo.get(NucleoEstoqueService),
      modulo.get(EstoqueService),
      modulo.get(ComprasService),
      modulo.get(VendasService),
      simulado,
      empresa.id,
      loja.id,
      central.id,
      localLoja.id,
      fornecedor.id,
      categoria.id,
    )
  }

  async encerrar(): Promise<void> {
    await this.modulo.close()
  }

  /* ------------------------------ fixtures ------------------------------ */

  /**
   * Produto ativo com preço na loja. `precoVenda: null` deixa o produto sem
   * configuração na loja — o caso "não está à venda aqui".
   */
  async criarProduto(
    nome: string,
    opcoes: { precoVenda?: number | null; ativoNaLoja?: boolean } = {},
  ) {
    const produto = await this.prisma.produto.create({
      data: {
        empresaId: this.empresaId,
        nome,
        categoriaId: this.categoriaId,
        buscaTexto: nome.toLowerCase(),
      },
    })

    if (opcoes.precoVenda !== null) {
      await this.prisma.configuracaoProdutoLoja.create({
        data: {
          produtoId: produto.id,
          lojaId: this.lojaId,
          precoVenda: opcoes.precoVenda ?? 10,
          ativo: opcoes.ativoNaLoja ?? true,
        },
      })
    }

    return produto
  }

  comprar(itens: ItemCompraDto[]) {
    return this.compras.confirmar(this.empresaId, OPERADOR, {
      fornecedorId: this.fornecedorId,
      localDestinoId: this.centralId,
      itens,
    })
  }

  abastecer(itens: Array<{ produtoId: string; quantidade: number }>) {
    return this.estoque.abastecer(this.empresaId, OPERADOR, { lojaId: this.lojaId, itens })
  }

  vender(entrada: Omit<RegistrarVendaDto, 'lojaId'> & { lojaId?: string }) {
    return this.vendas.registrar(this.empresaId, OPERADOR, {
      lojaId: this.lojaId,
      ...entrada,
    })
  }

  /* ------------------------------ totem ------------------------------ */

  abrir(entrada: Omit<AbrirVendaDto, 'lojaId'> & { lojaId?: string }) {
    return this.vendas.abrirVenda(this.empresaId, OPERADOR, { lojaId: this.lojaId, ...entrada })
  }

  pagar(vendaId: string, entrada: NovoPagamentoDto) {
    return this.vendas.adicionarPagamento(this.empresaId, OPERADOR, vendaId, entrada)
  }

  sincronizar(vendaId: string, pagamentoId: string) {
    return this.vendas.sincronizarPagamento(this.empresaId, OPERADOR, vendaId, pagamentoId)
  }

  abortar(vendaId: string, pagamentoId: string) {
    return this.vendas.abortarPagamento(this.empresaId, OPERADOR, vendaId, pagamentoId)
  }

  /** Venda como está no banco, com pagamentos. */
  venda(id: string) {
    return this.prisma.venda.findUniqueOrThrow({
      where: { id },
      include: { pagamentos: { orderBy: { criadoEm: 'asc' } } },
    })
  }

  /* ------------------------------ leituras ------------------------------ */

  saldo(produtoId: string, localId = this.localLojaId): Promise<number> {
    return this.nucleo.totalNoLocal(this.prisma, produtoId, localId)
  }

  /** Saldo por código de lote, incluindo zerados — para provar devolução exata. */
  async saldoPorLote(produtoId: string, localId = this.localLojaId): Promise<Record<string, number>> {
    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { produtoId, localId },
      include: { lote: { select: { codigo: true } } },
    })
    return Object.fromEntries(
      saldos.map((s) => [s.lote?.codigo ?? 'SEM_LOTE', s.quantidade.toNumber()]),
    )
  }

  totalGlobal(): Promise<number> {
    return this.nucleo.totalGlobal(this.prisma, this.empresaId)
  }

  movimentacoes(tipo?: TipoMovimentacao, produtoId?: string) {
    return this.prisma.movimentacaoEstoque.findMany({
      where: { empresaId: this.empresaId, ...(tipo ? { tipo } : {}), ...(produtoId ? { produtoId } : {}) },
      include: { lote: { select: { codigo: true } } },
      orderBy: { data: 'asc' },
    })
  }

  async custoMedio(produtoId: string): Promise<number | null> {
    const p = await this.prisma.produto.findUniqueOrThrow({
      where: { id: produtoId },
      select: { custoMedio: true },
    })
    return p.custoMedio?.toNumber() ?? null
  }
}
