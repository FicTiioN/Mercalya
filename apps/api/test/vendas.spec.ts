import { ConflictException } from '@nestjs/common'
import { TipoMovimentacao } from '@prisma/client'
import { Cenario, daqui, OPERADOR } from './cenario'

describe('Vendas — a única saída de estoque por venda', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  /** Produto com preço na loja, comprado em dois lotes e abastecido. */
  async function produtoNaPrateleira(
    nome: string,
    preco: number,
    opcoes: { lotes?: Array<{ codigo: string; quantidade: number; custo: number; dias: number }>; abastecer?: number } = {},
  ) {
    const p = await c.criarProduto(nome, { precoVenda: preco })
    const lotes = opcoes.lotes ?? [
      { codigo: 'A', quantidade: 10, custo: 3, dias: 5 },
      { codigo: 'B', quantidade: 10, custo: 3, dias: 30 },
    ]
    await c.comprar(
      lotes.map((l) => ({
        produtoId: p.id,
        quantidade: l.quantidade,
        custoUnitario: l.custo,
        validade: daqui(l.dias),
        lote: l.codigo,
      })),
    )
    await c.abastecer([{ produtoId: p.id, quantidade: opcoes.abastecer ?? 15 }])
    return p
  }

  it('registra debitando a loja por FEFO, com preço e custo congelados no item', async () => {
    const p = await produtoNaPrateleira('Refrigerante', 7.5)
    const antes = await c.totalGlobal()

    const { venda, repetida } = await c.vender({
      itens: [{ produtoId: p.id, quantidade: 4 }],
      pagamentos: [{ forma: 'dinheiro', valor: 50 }],
    })

    expect(repetida).toBe(false)
    expect(venda).toMatchObject({
      numero: 'VDA-001001',
      status: 'concluida',
      operador: OPERADOR,
      clienteNome: 'Consumidor final',
      subtotal: 30,
      total: 30,
      troco: 20,
      canal: 'PDV',
    })
    expect(venda.concluidaEm).not.toBeNull()
    expect(venda.itens).toHaveLength(1)
    expect(venda.itens[0]).toMatchObject({ quantidade: 4, precoUnitario: 7.5, total: 30 })
    expect(venda.pagamentos).toHaveLength(1)
    expect(venda.pagamentos[0]).toMatchObject({
      forma: 'dinheiro',
      valor: 50,
      status: 'aprovado',
      provedor: 'manual',
    })

    // A prateleira tinha A=10 (vence antes) e B=5: saíram 4 de A.
    expect(await c.saldoPorLote(p.id)).toEqual({ A: 6, B: 5 })
    expect(await c.totalGlobal()).toBe(antes - 4)

    const saidas = await c.movimentacoes(TipoMovimentacao.VENDA, p.id)
    expect(saidas).toHaveLength(1)
    expect(saidas[0]).toMatchObject({ documento: 'VDA-001001', origemId: c.localLojaId, lote: { codigo: 'A' } })
    expect(saidas[0].quantidade.toNumber()).toBe(-4)
    expect(saidas[0].custoUnitario?.toNumber()).toBe(3)
    expect(saidas[0].valorTotal?.toNumber()).toBe(30)

    // Custo médio do instante da venda fica no item: a margem é apurável depois.
    const item = await c.prisma.itemVenda.findFirstOrThrow({ where: { vendaId: venda.id } })
    expect(item.custoUnitario?.toNumber()).toBe(3)

    const produto = await c.prisma.produto.findUniqueOrThrow({ where: { id: p.id } })
    expect(produto.ultimaVendaEm).not.toBeNull()
  })

  it('soma repetições do mesmo produto — o leitor passou duas vezes pelo código', async () => {
    const p = await produtoNaPrateleira('Bala', 1)

    const { venda } = await c.vender({
      itens: [
        { produtoId: p.id, quantidade: 1 },
        { produtoId: p.id, quantidade: 2 },
      ],
      pagamentos: [{ forma: 'pix', valor: 3 }],
    })

    expect(venda.itens).toHaveLength(1)
    expect(venda.itens[0].quantidade).toBe(3)
    expect(venda.total).toBe(3)
  })

  it('sem saldo na loja não vende — e não grava nada, nem consome a numeração', async () => {
    const p = await produtoNaPrateleira('Chocolate', 5, { abastecer: 2 })
    const vendasAntes = await c.prisma.venda.count({ where: { empresaId: c.empresaId } })

    await expect(
      c.vender({
        itens: [{ produtoId: p.id, quantidade: 5 }],
        pagamentos: [{ forma: 'dinheiro', valor: 25 }],
      }),
    ).rejects.toThrow(/insuficiente/)

    expect(await c.prisma.venda.count({ where: { empresaId: c.empresaId } })).toBe(vendasAntes)
    expect(await c.prisma.pagamento.count({ where: { empresaId: c.empresaId } })).toBe(vendasAntes)
    expect(await c.saldo(p.id)).toBe(2)
    expect(await c.movimentacoes(TipoMovimentacao.VENDA, p.id)).toHaveLength(0)
  })

  it('recusa produto sem configuração na loja, desativado na loja, ou sem preço', async () => {
    const semConfig = await c.criarProduto('Sem configuração', { precoVenda: null })
    const desativado = await c.criarProduto('Desativado', { ativoNaLoja: false })
    const semPreco = await c.criarProduto('Sem preço', { precoVenda: 0 })
    const pagar = [{ forma: 'dinheiro' as const, valor: 100 }]

    await expect(
      c.vender({ itens: [{ produtoId: semConfig.id, quantidade: 1 }], pagamentos: pagar }),
    ).rejects.toThrow(/não está à venda nesta loja/)

    await expect(
      c.vender({ itens: [{ produtoId: desativado.id, quantidade: 1 }], pagamentos: pagar }),
    ).rejects.toThrow(/não está disponível/)

    await expect(
      c.vender({ itens: [{ produtoId: semPreco.id, quantidade: 1 }], pagamentos: pagar }),
    ).rejects.toThrow(/sem preço/)
  })

  it('pagamento insuficiente é recusado; troco só nasce de dinheiro', async () => {
    const p = await produtoNaPrateleira('Suco', 15)
    const item = [{ produtoId: p.id, quantidade: 1 }]

    await expect(
      c.vender({ itens: item, pagamentos: [{ forma: 'pix', valor: 10 }] }),
    ).rejects.toThrow(/insuficiente: faltam R\$ 5,00/)

    await expect(
      c.vender({ itens: item, pagamentos: [{ forma: 'cartao-credito', valor: 20 }] }),
    ).rejects.toThrow(/Só pagamento em dinheiro pode gerar troco/)

    // Nada das duas recusas ficou.
    expect(await c.saldo(p.id)).toBe(15)

    const { venda } = await c.vender({
      itens: item,
      pagamentos: [
        { forma: 'cartao-debito', valor: 10 },
        { forma: 'dinheiro', valor: 10 },
      ],
    })
    expect(venda.total).toBe(15)
    expect(venda.troco).toBe(5)
    expect(venda.pagamentos.map((x) => [x.forma, x.valor])).toEqual([
      ['cartao-debito', 10],
      ['dinheiro', 10],
    ])
  })

  it('mesma chave de idempotência devolve a mesma venda — inclusive em corrida', async () => {
    const p = await produtoNaPrateleira('Biscoito', 4)
    const pedido = {
      itens: [{ produtoId: p.id, quantidade: 2 }],
      pagamentos: [{ forma: 'pix' as const, valor: 8 }],
    }

    // Reenvio sequencial: a rede caiu depois do commit e o totem tentou de novo.
    const primeira = await c.vender({ ...pedido, chaveIdempotencia: 'totem-1-0001' })
    const segunda = await c.vender({ ...pedido, chaveIdempotencia: 'totem-1-0001' })
    expect(primeira.repetida).toBe(false)
    expect(segunda.repetida).toBe(true)
    expect(segunda.venda.id).toBe(primeira.venda.id)
    expect(await c.saldo(p.id)).toBe(13)

    // Corrida: as duas chegam antes de qualquer uma ter gravado.
    const [a, b] = await Promise.all([
      c.vender({ ...pedido, chaveIdempotencia: 'totem-1-0002' }),
      c.vender({ ...pedido, chaveIdempotencia: 'totem-1-0002' }),
    ])
    expect(a.venda.id).toBe(b.venda.id)
    expect([a.repetida, b.repetida].sort()).toEqual([false, true])
    expect(await c.saldo(p.id)).toBe(11)
    expect(
      await c.prisma.venda.count({ where: { empresaId: c.empresaId, chaveIdempotencia: 'totem-1-0002' } }),
    ).toBe(1)
  })

  it('cancelar devolve exatamente os lotes que saíram e estorna o pagamento', async () => {
    const p = await produtoNaPrateleira('Cerveja', 6, {
      lotes: [
        { codigo: 'A', quantidade: 10, custo: 2, dias: 5 },
        { codigo: 'B', quantidade: 10, custo: 3, dias: 30 },
      ],
    })
    const antes = await c.totalGlobal()

    // Loja: A=10, B=5. Vender 12 leva A inteiro e 2 de B.
    const { venda } = await c.vender({
      itens: [{ produtoId: p.id, quantidade: 12 }],
      pagamentos: [{ forma: 'cartao-credito', valor: 72 }],
    })
    expect(await c.saldoPorLote(p.id)).toEqual({ A: 0, B: 3 })
    expect(await c.totalGlobal()).toBe(antes - 12)

    const cancelada = await c.vendas.cancelar(c.empresaId, OPERADOR, venda.numero, 'Cliente desistiu')

    expect(cancelada.status).toBe('cancelada')
    expect(cancelada.observacao).toBe('Cliente desistiu')
    expect(cancelada.pagamentos[0].status).toBe('estornado')
    expect(await c.saldoPorLote(p.id)).toEqual({ A: 10, B: 5 })
    expect(await c.totalGlobal()).toBe(antes)

    const devolucoes = await c.movimentacoes(TipoMovimentacao.DEVOLUCAO, p.id)
    expect(devolucoes.map((m) => [m.lote?.codigo, m.quantidade.toNumber()])).toEqual([
      ['A', 10],
      ['B', 2],
    ])
    expect(devolucoes.every((m) => m.documento === venda.numero && m.destinoId === c.localLojaId)).toBe(true)

    await expect(c.vendas.cancelar(c.empresaId, OPERADOR, venda.id)).rejects.toThrow(
      ConflictException,
    )
  })

  it('identidade contábil: entradas − perdas − vendas + devoluções de cliente = estoque', async () => {
    const p = await c.criarProduto('Pão', { precoVenda: 0.8 })
    await c.comprar([{ produtoId: p.id, quantidade: 100, custoUnitario: 0.3, validade: daqui(2) }])
    await c.abastecer([{ produtoId: p.id, quantidade: 40 }])
    await c.estoque.registrarPerda(c.empresaId, OPERADOR, {
      produtoId: p.id,
      localId: c.centralId,
      motivo: 'quebra',
      quantidade: 3,
    })
    await c.vender({
      itens: [{ produtoId: p.id, quantidade: 7 }],
      pagamentos: [{ forma: 'dinheiro', valor: 5.6 }],
    })
    const desfeita = await c.vender({
      itens: [{ produtoId: p.id, quantidade: 5 }],
      pagamentos: [{ forma: 'pix', valor: 4 }],
    })
    await c.vendas.cancelar(c.empresaId, OPERADOR, desfeita.venda.id)

    const movs = await c.movimentacoes(undefined, p.id)
    const soma = (tipo: TipoMovimentacao) =>
      movs.filter((m) => m.tipo === tipo).reduce((acc, m) => acc + m.quantidade.toNumber(), 0)

    const entradas = soma(TipoMovimentacao.ENTRADA)
    const perdas = soma(TipoMovimentacao.PERDA)
    const vendas = soma(TipoMovimentacao.VENDA)
    // Devolução de cliente entra de fora (origem nula); retirada da loja é
    // interna e não altera o total — aqui só existe a primeira.
    const devolucoes = movs
      .filter((m) => m.tipo === TipoMovimentacao.DEVOLUCAO && m.origemId === null)
      .reduce((acc, m) => acc + m.quantidade.toNumber(), 0)

    expect([entradas, perdas, vendas, devolucoes]).toEqual([100, -3, -12, 5])

    const emEstoque =
      (await c.saldo(p.id, c.centralId)) + (await c.saldo(p.id, c.localLojaId))
    expect(emEstoque).toBe(90)
    expect(entradas + perdas + vendas + devolucoes).toBe(emEstoque)
  })

  it('listagem filtra por forma de pagamento e localiza por número', async () => {
    const p = await produtoNaPrateleira('Água com gás', 3)
    const { venda } = await c.vender({
      itens: [{ produtoId: p.id, quantidade: 1 }],
      pagamentos: [{ forma: 'pix', valor: 3 }],
    })

    const pix = await c.vendas.listar(c.empresaId, { formaPagamento: 'pix', porPagina: 200 })
    expect(pix.itens.some((v) => v.id === venda.id)).toBe(true)

    const so = await c.vendas.listar(c.empresaId, { busca: venda.numero })
    expect(so.itens.map((v) => v.id)).toEqual([venda.id])

    const porNumero = await c.vendas.obter(c.empresaId, venda.numero)
    expect(porNumero.id).toBe(venda.id)
  })

  it('histórico narra os fatos gravados, em ordem', async () => {
    const p = await produtoNaPrateleira('Salgadinho', 9)
    const { venda } = await c.vender({
      itens: [{ produtoId: p.id, quantidade: 1 }],
      pagamentos: [{ forma: 'dinheiro', valor: 10 }],
    })

    let eventos = await c.vendas.historico(c.empresaId, venda.id)
    expect(eventos.map((e) => e.titulo)).toEqual([
      'Venda registrada',
      'Pagamento aprovado',
      'Estoque baixado',
    ])

    await c.vendas.cancelar(c.empresaId, OPERADOR, venda.id)
    eventos = await c.vendas.historico(c.empresaId, venda.id)
    expect(eventos.at(-1)).toMatchObject({
      titulo: 'Venda cancelada',
      descricao: 'Pagamentos estornados e mercadoria devolvida à prateleira.',
    })
  })

  it('não vê nem vende produto de outra empresa', async () => {
    const outra = await Cenario.montar()
    try {
      const alheio = await outra.criarProduto('Alheio', { precoVenda: 1 })
      await expect(
        c.vender({
          itens: [{ produtoId: alheio.id, quantidade: 1 }],
          pagamentos: [{ forma: 'dinheiro', valor: 1 }],
        }),
      ).rejects.toThrow(/Produto não encontrado/)
    } finally {
      await outra.encerrar()
    }
  })
})
