import { TipoMovimentacao } from '@prisma/client'
import { Cenario, daqui } from './cenario'

describe('Abastecimento — transferência central → loja', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  it('move sem criar nem destruir, lote a lote e por FEFO', async () => {
    const p = await c.criarProduto('Leite')
    await c.comprar([
      { produtoId: p.id, quantidade: 20, custoUnitario: 4, validade: daqui(20), lote: 'L20' },
      { produtoId: p.id, quantidade: 10, custoUnitario: 4, validade: daqui(3), lote: 'L03' },
    ])

    const antes = await c.totalGlobal()
    const resultado = await c.abastecer([{ produtoId: p.id, quantidade: 12 }])

    expect(resultado.totalGlobalAntes).toBe(antes)
    expect(resultado.totalGlobalDepois).toBe(antes)
    expect(await c.totalGlobal()).toBe(antes)

    // Saiu tudo do que vence antes, e só o que faltou do outro.
    expect(await c.saldoPorLote(p.id, c.centralId)).toEqual({ L03: 0, L20: 18 })
    expect(await c.saldoPorLote(p.id)).toEqual({ L03: 10, L20: 2 })

    const transferencias = await c.movimentacoes(TipoMovimentacao.TRANSFERENCIA, p.id)
    expect(transferencias.map((m) => [m.lote?.codigo, m.quantidade.toNumber()])).toEqual([
      ['L03', 10],
      ['L20', 2],
    ])
  })

  it('recusa acima do disponível e nada muda', async () => {
    const p = await c.criarProduto('Manteiga')
    await c.comprar([{ produtoId: p.id, quantidade: 5, custoUnitario: 9 }])

    await expect(c.abastecer([{ produtoId: p.id, quantidade: 6 }])).rejects.toThrow(
      /insuficiente/,
    )

    expect(await c.saldo(p.id, c.centralId)).toBe(5)
    expect(await c.saldo(p.id)).toBe(0)
    expect(await c.movimentacoes(TipoMovimentacao.TRANSFERENCIA, p.id)).toHaveLength(0)
  })
})
