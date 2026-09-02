import { Cenario, daqui } from './cenario'

describe('Núcleo do estoque', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  it('saldo nunca fica negativo, mesmo com débito maior que o disponível', async () => {
    const p = await c.criarProduto('Água')

    await c.nucleo.executar(async (tx) => {
      const base = { empresaId: c.empresaId, produtoId: p.id, loteId: null, localId: c.centralId }
      await c.nucleo.aplicarSaldo(tx, { ...base, delta: 5 })
      await c.nucleo.aplicarSaldo(tx, { ...base, delta: -12 })
    })

    expect(await c.saldo(p.id, c.centralId)).toBe(0)
  })

  it('FEFO: vence antes, sai antes — e mercadoria sem validade sai por último', async () => {
    const p = await c.criarProduto('Iogurte')
    await c.comprar([
      { produtoId: p.id, quantidade: 10, custoUnitario: 2, validade: daqui(30), lote: 'LONGE' },
      { produtoId: p.id, quantidade: 10, custoUnitario: 2, validade: daqui(5), lote: 'PERTO' },
      { produtoId: p.id, quantidade: 10, custoUnitario: 2, lote: 'SEM_VALIDADE' },
    ])

    const consumidos = await c.nucleo.executar((tx) =>
      c.nucleo.consumirFefo(tx, { produtoId: p.id, localId: c.centralId, quantidade: 15 }),
    )

    const lotes = await c.prisma.lote.findMany({
      where: { id: { in: consumidos.map((x) => x.loteId!) } },
    })
    const ordem = consumidos.map((x) => lotes.find((l) => l.id === x.loteId)?.codigo)

    expect(ordem).toEqual(['PERTO', 'LONGE'])
    expect(consumidos.map((x) => x.quantidade)).toEqual([10, 5])
    expect(await c.saldoPorLote(p.id, c.centralId)).toEqual({
      PERTO: 0,
      LONGE: 5,
      SEM_VALIDADE: 10,
    })
  })

  it('custo médio é ponderado pelos lotes com saldo; sem saldo, mantém o da última entrada', async () => {
    const p = await c.criarProduto('Arroz')
    await c.comprar([
      { produtoId: p.id, quantidade: 10, custoUnitario: 2, validade: daqui(5), lote: 'BARATO' },
      { produtoId: p.id, quantidade: 10, custoUnitario: 4, validade: daqui(30), lote: 'CARO' },
    ])
    expect(await c.custoMedio(p.id)).toBe(3)

    // Sai o lote barato (vence antes): só sobra o caro.
    await c.nucleo.executar(async (tx) => {
      await c.nucleo.consumirFefo(tx, { produtoId: p.id, localId: c.centralId, quantidade: 10 })
      await c.nucleo.recalcularCusto(tx, p.id)
    })
    expect(await c.custoMedio(p.id)).toBe(4)

    // Sem saldo nenhum, o custo não zera — zerar faria a próxima margem parecer 100%.
    await c.nucleo.executar(async (tx) => {
      await c.nucleo.consumirFefo(tx, { produtoId: p.id, localId: c.centralId, quantidade: 10 })
      await c.nucleo.recalcularCusto(tx, p.id)
    })
    expect(await c.saldo(p.id, c.centralId)).toBe(0)
    expect(await c.custoMedio(p.id)).toBe(4)
  })

  it('numeração: sequencial, sem colisão em paralelo, com zeros à esquerda quando pedido', async () => {
    const primeiro = await c.nucleo.executar((tx) =>
      c.nucleo.proximoNumero(tx, c.empresaId, 'teste', 'T', 100),
    )
    expect(primeiro).toBe('T-101')

    // Oito transações disputando a mesma linha: o lock serializa, ninguém repete.
    const numeros = await Promise.all(
      Array.from({ length: 8 }, () =>
        c.nucleo.executar((tx) => c.nucleo.proximoNumero(tx, c.empresaId, 'teste', 'T', 100)),
      ),
    )
    expect(new Set(numeros).size).toBe(8)
    expect([...numeros].sort()).toEqual(
      Array.from({ length: 8 }, (_, i) => `T-${102 + i}`),
    )

    const venda = await c.nucleo.executar((tx) =>
      c.nucleo.proximoNumero(tx, c.empresaId, 'venda', 'VDA', 1000, 6),
    )
    expect(venda).toBe('VDA-001001')
  })
})
