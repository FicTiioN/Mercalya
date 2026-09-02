import { TipoMovimentacao } from '@prisma/client'
import { Cenario, daqui } from './cenario'

describe('Compras — a única entrada de estoque', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  it('confirmar grava lote, saldo, custo médio e ENTRADA no mesmo commit', async () => {
    const p = await c.criarProduto('Café')

    const resultado = await c.comprar([
      { produtoId: p.id, quantidade: 24, custoUnitario: 12.5, validade: daqui(180), lote: 'CF1' },
    ])

    expect(resultado.compra.numero).toBe('CP-1201')
    expect(resultado.compra.status).toBe('confirmada')
    expect(resultado.compra.total).toBe(300)

    expect(await c.saldoPorLote(p.id, c.centralId)).toEqual({ CF1: 24 })
    expect(await c.custoMedio(p.id)).toBe(12.5)

    const entradas = await c.movimentacoes(TipoMovimentacao.ENTRADA, p.id)
    expect(entradas).toHaveLength(1)
    expect(entradas[0]).toMatchObject({
      destinoId: c.centralId,
      lote: { codigo: 'CF1' },
    })
    expect(entradas[0].quantidade.toNumber()).toBe(24)
    expect(entradas[0].custoUnitario?.toNumber()).toBe(12.5)
  })

  it('uma falha no segundo item não deixa rastro do primeiro — nem consome a numeração', async () => {
    const a = await c.criarProduto('Feijão')
    const b = await c.criarProduto('Absurdo')

    // 1e12 estoura Decimal(14,3): o banco recusa o segundo item depois que o
    // primeiro já foi gravado dentro da transação.
    await expect(
      c.comprar([
        { produtoId: a.id, quantidade: 10, custoUnitario: 2 },
        { produtoId: b.id, quantidade: 1e12, custoUnitario: 1 },
      ]),
    ).rejects.toThrow()

    expect(await c.saldo(a.id, c.centralId)).toBe(0)
    expect(await c.custoMedio(a.id)).toBeNull()
    expect(await c.prisma.lote.count({ where: { produtoId: a.id } })).toBe(0)
    expect(await c.movimentacoes(undefined, a.id)).toHaveLength(0)
    expect(
      await c.prisma.compra.count({ where: { empresaId: c.empresaId, itens: { some: { produtoId: a.id } } } }),
    ).toBe(0)

    // O increment da sequência também voltou: a próxima compra é a 1202, não a 1203.
    const ok = await c.comprar([{ produtoId: a.id, quantidade: 1, custoUnitario: 2 }])
    expect(ok.compra.numero).toBe('CP-1202')
  })

  it('recusa produto de outra empresa', async () => {
    const outra = await Cenario.montar()
    try {
      const alheio = await outra.criarProduto('De outra empresa')
      await expect(
        c.comprar([{ produtoId: alheio.id, quantidade: 1, custoUnitario: 1 }]),
      ).rejects.toThrow(/não encontrado/)
    } finally {
      await outra.encerrar()
    }
  })
})
