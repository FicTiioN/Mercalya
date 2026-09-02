import { ConflictException } from '@nestjs/common'
import { StatusPagamento, StatusVenda, TipoMovimentacao } from '@prisma/client'
import { Cenario, daqui, OPERADOR } from './cenario'

describe('Pagamento pela maquininha — venda aberta, provedor simulado, conciliação', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  /** Produto com preço na loja e `quantidade` unidades na prateleira. */
  async function naPrateleira(nome: string, preco: number, quantidade = 10, em: Cenario = c) {
    const p = await em.criarProduto(nome, { precoVenda: preco })
    await em.comprar([{ produtoId: p.id, quantidade: quantidade * 2, custoUnitario: 1, validade: daqui(30) }])
    await em.abastecer([{ produtoId: p.id, quantidade }])
    return p
  }

  it('abrir não toca no estoque; pagar por provedor nasce pendente com referência externa', async () => {
    const p = await naPrateleira('Energético', 9)
    const antes = await c.saldo(p.id)

    const { venda, repetida } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
    expect(repetida).toBe(false)
    expect(venda.status).toBe('aberta')
    expect(venda.pagamentos).toEqual([])
    expect(await c.saldo(p.id)).toBe(antes)

    const s = await c.pagar(venda.id, { forma: 'cartao-credito', valor: 9, provedor: 'simulado' })
    expect(s.pagamento).toMatchObject({ status: 'pendente', provedor: 'simulado', valor: 9 })
    expect(s.venda.status).toBe('aberta')
    expect(await c.saldo(p.id)).toBe(antes)

    const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: s.pagamento.id } })
    expect(linha.referenciaExterna).toMatch(/^sim_/)
    expect(linha.retornoBruto).toMatchObject({ type: 'point', status: 'at_terminal' })
  })

  it('sincronizar aprova, conclui a venda e debita — com os dados do adquirente no pagamento', async () => {
    const p = await naPrateleira('Chiclete', 2.5)
    const antes = await c.saldo(p.id)

    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 2 }] })
    const pendente = await c.pagar(venda.id, { forma: 'cartao-debito', valor: 5, provedor: 'simulado' })

    const s = await c.sincronizar(venda.id, pendente.pagamento.id)

    expect(s.pagamento).toMatchObject({ status: 'aprovado', bandeira: 'Visa', ultimosDigitos: '4242' })
    expect(s.pagamento.autorizacao).toMatch(/^\d{6}$/)
    expect(s.pagamento.confirmadoEm).not.toBeNull()
    expect(s.venda.status).toBe('concluida')
    expect(s.venda.troco).toBe(0)
    expect(await c.saldo(p.id)).toBe(antes - 2)

    const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: s.pagamento.id } })
    expect(linha.retornoBruto).toMatchObject({ status: 'processed', status_detail: 'accredited' })

    const saidas = await c.movimentacoes(TipoMovimentacao.VENDA, p.id)
    expect(saidas).toHaveLength(1)
    expect(saidas[0].usuario).toBe(OPERADOR)
  })

  it('o terminal só responde quando o cliente aproxima o cartão (controle do simulador)', async () => {
    c.simulado.configurar({ atrasoMs: 60_000 })
    try {
      const p = await naPrateleira('Pilha', 12)
      const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      const { pagamento } = await c.pagar(venda.id, { forma: 'pix', valor: 12, provedor: 'simulado' })

      // Polling antes do cartão: continua pendente, estoque intacto.
      let s = await c.sincronizar(venda.id, pagamento.id)
      expect(s.pagamento.status).toBe('pendente')
      expect(s.venda.status).toBe('aberta')

      const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } })
      c.simulado.forcar(linha.referenciaExterna!, 'aprovado')

      s = await c.sincronizar(venda.id, pagamento.id)
      expect(s.pagamento).toMatchObject({ status: 'aprovado', bandeira: 'Pix' })
      expect(s.venda.status).toBe('concluida')
    } finally {
      c.simulado.configurar({ atrasoMs: 0 })
    }
  })

  it('recusa (.99) deixa a venda aberta; pagar em dinheiro depois conclui com troco', async () => {
    const p = await naPrateleira('Pão de queijo', 3.99)
    const antes = await c.saldo(p.id)

    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
    const cartao = await c.pagar(venda.id, { forma: 'cartao-credito', valor: 3.99, provedor: 'simulado' })

    const recusado = await c.sincronizar(venda.id, cartao.pagamento.id)
    expect(recusado.pagamento).toMatchObject({ status: 'recusado', motivoRecusa: 'Cartão recusado pelo emissor.' })
    expect(recusado.venda.status).toBe('aberta')
    expect(await c.saldo(p.id)).toBe(antes)

    const dinheiro = await c.pagar(venda.id, { forma: 'dinheiro', valor: 5 })
    expect(dinheiro.pagamento.status).toBe('aprovado')
    expect(dinheiro.venda.status).toBe('concluida')
    expect(dinheiro.venda.troco).toBe(1.01)
    expect(dinheiro.venda.pagamentos.map((x) => x.status)).toEqual(['recusado', 'aprovado'])
    expect(await c.saldo(p.id)).toBe(antes - 1)

    const eventos = await c.vendas.historico(c.empresaId, venda.id)
    expect(eventos.map((e) => e.titulo)).toEqual([
      'Venda registrada',
      'Pagamento recusado',
      'Pagamento aprovado',
      'Estoque baixado',
    ])
  })

  it('uma maquininha por vez: com pendente, outro pagamento é recusado; abortar libera', async () => {
    const p = await naPrateleira('Detergente', 4)
    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })

    c.simulado.configurar({ atrasoMs: 60_000 })
    try {
      const { pagamento } = await c.pagar(venda.id, { forma: 'cartao-credito', valor: 4, provedor: 'simulado' })

      await expect(c.pagar(venda.id, { forma: 'dinheiro', valor: 4 })).rejects.toThrow(
        /aguardando a maquininha/,
      )

      const abortado = await c.abortar(venda.id, pagamento.id)
      expect(abortado.pagamento.status).toBe('cancelado')
      expect(abortado.venda.status).toBe('aberta')

      await expect(c.abortar(venda.id, pagamento.id)).rejects.toThrow(ConflictException)

      const pago = await c.pagar(venda.id, { forma: 'dinheiro', valor: 4 })
      expect(pago.venda.status).toBe('concluida')
    } finally {
      c.simulado.configurar({ atrasoMs: 0 })
    }
  })

  it('pagamento dividido: cartão cobre parte, dinheiro fecha; cartão acima do restante é recusado', async () => {
    const p = await naPrateleira('Vinho', 40)
    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })

    await expect(
      c.pagar(venda.id, { forma: 'cartao-credito', valor: 45, provedor: 'simulado' }),
    ).rejects.toThrow(/Só pagamento em dinheiro pode gerar troco/)

    const cartao = await c.pagar(venda.id, { forma: 'cartao-credito', valor: 25, parcelas: 2, provedor: 'simulado' })
    const aprovado = await c.sincronizar(venda.id, cartao.pagamento.id)
    expect(aprovado.pagamento).toMatchObject({ status: 'aprovado', parcelas: 2 })
    // Coberto pela metade: continua aberta.
    expect(aprovado.venda.status).toBe('aberta')

    await expect(c.pagar(venda.id, { forma: 'pix', valor: 20 })).rejects.toThrow(
      /Só pagamento em dinheiro pode gerar troco/,
    )

    const dinheiro = await c.pagar(venda.id, { forma: 'dinheiro', valor: 20 })
    expect(dinheiro.venda.status).toBe('concluida')
    expect(dinheiro.venda.troco).toBe(5)
    expect(dinheiro.venda.pagamentos.map((x) => [x.forma, x.valor, x.status])).toEqual([
      ['cartao-credito', 25, 'aprovado'],
      ['dinheiro', 20, 'aprovado'],
    ])

    await expect(c.pagar(venda.id, { forma: 'dinheiro', valor: 1 })).rejects.toThrow(
      /não está aberta/,
    )
  })

  it('mesma chave no pagamento devolve o mesmo pagamento e não aciona a maquininha de novo', async () => {
    const p = await naPrateleira('Água tônica', 6)
    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })

    const pedido = { forma: 'pix' as const, valor: 6, provedor: 'simulado', chaveIdempotencia: 'totem-9-1' }
    const a = await c.pagar(venda.id, pedido)
    const b = await c.pagar(venda.id, pedido)

    expect(b.pagamento.id).toBe(a.pagamento.id)
    expect((await c.venda(venda.id)).pagamentos).toHaveLength(1)
  })

  it('dois pollers ao mesmo tempo: a aprovação é aplicada uma vez e o estoque baixa uma vez', async () => {
    const p = await naPrateleira('Amendoim', 7)
    const antes = await c.saldo(p.id)
    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 3 }] })
    const { pagamento } = await c.pagar(venda.id, { forma: 'cartao-debito', valor: 21, provedor: 'simulado' })

    const resultados = await Promise.all(
      Array.from({ length: 4 }, () => c.sincronizar(venda.id, pagamento.id)),
    )

    expect(resultados.every((r) => r.venda.status === 'concluida')).toBe(true)
    expect(await c.saldo(p.id)).toBe(antes - 3)
    expect(await c.movimentacoes(TipoMovimentacao.VENDA, p.id)).toHaveLength(1)
  })

  it('aprovado sem estoque para concluir: estorna no provedor e cancela a venda dizendo por quê', async () => {
    const p = await naPrateleira('Último item', 10, 1)

    // Dois carrinhos disputam a única unidade. Nenhum debita ao abrir.
    const a = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
    const b = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
    const cartaoB = await c.pagar(b.venda.id, { forma: 'cartao-credito', valor: 10, provedor: 'simulado' })

    // A paga em dinheiro e leva a unidade enquanto o cartão de B processa.
    const pagoA = await c.pagar(a.venda.id, { forma: 'dinheiro', valor: 10 })
    expect(pagoA.venda.status).toBe('concluida')
    expect(await c.saldo(p.id)).toBe(0)

    // O cartão de B aprova — o dinheiro entrou — mas não há o que entregar.
    const s = await c.sincronizar(b.venda.id, cartaoB.pagamento.id)
    expect(s.pagamento.status).toBe('estornado')
    expect(s.venda.status).toBe('cancelada')
    expect(s.venda.observacao).toMatch(/Cancelada automaticamente: Estoque insuficiente de "Último item"/)
    expect(s.venda.observacao).toMatch(/Pagamento estornado/)

    const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: cartaoB.pagamento.id } })
    expect(linha.retornoBruto).toMatchObject({ status: 'refunded' })
    expect(await c.saldo(p.id)).toBe(0)
    expect(await c.movimentacoes(TipoMovimentacao.DEVOLUCAO, p.id)).toHaveLength(0)
  })

  it('cancelar venda concluída no cartão estorna no provedor, além de devolver aos lotes', async () => {
    const p = await naPrateleira('Azeite', 30)
    const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
    const { pagamento } = await c.pagar(venda.id, { forma: 'cartao-credito', valor: 30, provedor: 'simulado' })
    await c.sincronizar(venda.id, pagamento.id)
    const antes = await c.saldo(p.id)

    const cancelada = await c.vendas.cancelar(c.empresaId, OPERADOR, venda.id, 'Produto vencido')
    expect(cancelada.status).toBe('cancelada')
    expect(cancelada.pagamentos[0].status).toBe('estornado')
    expect(await c.saldo(p.id)).toBe(antes + 1)

    const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } })
    expect(linha.retornoBruto).toMatchObject({ status: 'refunded' })
  })

  it('cancelar venda aberta com cartão pendente aborta no provedor', async () => {
    c.simulado.configurar({ atrasoMs: 60_000 })
    try {
      const p = await naPrateleira('Sabonete', 3)
      const { venda } = await c.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      const { pagamento } = await c.pagar(venda.id, { forma: 'cartao-debito', valor: 3, provedor: 'simulado' })

      const cancelada = await c.vendas.cancelar(c.empresaId, OPERADOR, venda.id)
      expect(cancelada.pagamentos[0].status).toBe('cancelado')

      const linha = await c.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } })
      expect(linha.retornoBruto).toMatchObject({ status: 'canceled' })
    } finally {
      c.simulado.configurar({ atrasoMs: 0 })
    }
  })

  describe('conciliação', () => {
    const daquiAMinutos = (min: number) => new Date(Date.now() + min * 60_000)

    // Empresa nova por teste: a conciliação varre a empresa inteira, e os
    // pendentes deixados pelos testes acima entrariam na conta.
    let cc: Cenario
    beforeEach(async () => {
      cc = await Cenario.montar()
    })
    afterEach(() => cc.encerrar())

    it('ignora o que acabou de nascer', async () => {
      const p = await naPrateleira('Fresco', 5, 10, cc)
      const { venda } = await cc.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      await cc.pagar(venda.id, { forma: 'pix', valor: 5, provedor: 'simulado' })

      const r = await cc.vendas.conciliar(cc.empresaId)
      expect(r.verificados).toBe(0)
      expect((await cc.venda(venda.id)).status).toBe(StatusVenda.ABERTA)
    })

    it('aprovado no provedor mas nunca sincronizado (o totem caiu): conclui a venda sozinha', async () => {
      const p = await naPrateleira('Caiu a rede', 8, 10, cc)
      const antes = await cc.saldo(p.id)
      const { venda } = await cc.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      await cc.pagar(venda.id, { forma: 'cartao-credito', valor: 8, provedor: 'simulado' })

      const r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(1))
      expect(r).toMatchObject({ verificados: 1, aprovados: 1, erros: 0 })

      const atual = await cc.venda(venda.id)
      expect(atual.status).toBe(StatusVenda.CONCLUIDA)
      expect(atual.pagamentos[0].status).toBe(StatusPagamento.APROVADO)
      expect(await cc.saldo(p.id)).toBe(antes - 1)

      const saida = await cc.movimentacoes(TipoMovimentacao.VENDA, p.id)
      expect(saida[0].usuario).toBe('Conciliação automática')
    })

    it('cliente foi embora (.98): pendente há mais de 10 minutos expira e é abortado no provedor', async () => {
      const p = await naPrateleira('Foi embora', 4.98, 10, cc)
      const { venda } = await cc.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      const { pagamento } = await cc.pagar(venda.id, { forma: 'cartao-debito', valor: 4.98, provedor: 'simulado' })

      // Aos 5 minutos ainda espera.
      let r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(5))
      expect(r).toMatchObject({ verificados: 1, expirados: 0 })
      expect((await cc.venda(venda.id)).pagamentos[0].status).toBe(StatusPagamento.PENDENTE)

      // Aos 11, expira.
      r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(11))
      expect(r).toMatchObject({ verificados: 1, expirados: 1 })

      const atual = await cc.venda(venda.id)
      expect(atual.status).toBe(StatusVenda.ABERTA)
      expect(atual.pagamentos[0]).toMatchObject({
        status: StatusPagamento.EXPIRADO,
        motivoRecusa: 'Sem resposta do cliente no prazo.',
      })
      const linha = await cc.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } })
      expect(linha.retornoBruto).toMatchObject({ status: 'canceled' })
    })

    it('pendente que nunca chegou ao provedor (a API caiu no meio) expira sem consultar', async () => {
      const p = await naPrateleira('Sem referência', 2, 10, cc)
      const { venda } = await cc.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      const pendente = await cc.prisma.pagamento.create({
        data: {
          empresaId: cc.empresaId,
          vendaId: venda.id,
          forma: 'PIX',
          valor: 2,
          provedor: 'simulado',
          status: StatusPagamento.PENDENTE,
        },
      })

      const r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(11))
      expect(r.expirados).toBeGreaterThanOrEqual(1)

      const linha = await cc.prisma.pagamento.findUniqueOrThrow({ where: { id: pendente.id } })
      expect(linha).toMatchObject({ status: StatusPagamento.EXPIRADO, motivoRecusa: 'Nunca chegou ao provedor.' })
    })

    it('venda aberta há mais de 1 hora sem pagamento pendente é abandonada: cancela e estorna o que entrou', async () => {
      const p = await naPrateleira('Abandonado', 20, 10, cc)
      const { venda } = await cc.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
      // Pagou metade no cartão e sumiu.
      const { pagamento } = await cc.pagar(venda.id, { forma: 'cartao-credito', valor: 10, provedor: 'simulado' })
      await cc.sincronizar(venda.id, pagamento.id)
      expect((await cc.venda(venda.id)).status).toBe(StatusVenda.ABERTA)

      const r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(61))
      expect(r.abandonadas).toBe(1)

      const atual = await cc.venda(venda.id)
      expect(atual.status).toBe(StatusVenda.CANCELADA)
      expect(atual.observacao).toMatch(/abandonada/)
      expect(atual.pagamentos[0].status).toBe(StatusPagamento.ESTORNADO)
      const linha = await cc.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } })
      expect(linha.retornoBruto).toMatchObject({ status: 'refunded' })
    })

    it('não enxerga pagamentos de outra empresa', async () => {
      const outra = await Cenario.montar()
      try {
        const p = await outra.criarProduto('Alheio', { precoVenda: 5 })
        await outra.comprar([{ produtoId: p.id, quantidade: 5, custoUnitario: 1 }])
        await outra.abastecer([{ produtoId: p.id, quantidade: 5 }])
        const { venda } = await outra.abrir({ itens: [{ produtoId: p.id, quantidade: 1 }] })
        await outra.pagar(venda.id, { forma: 'pix', valor: 5, provedor: 'simulado' })

        const r = await cc.vendas.conciliar(cc.empresaId, daquiAMinutos(1))
        expect(r.aprovados).toBe(0)
        expect((await outra.venda(venda.id)).status).toBe(StatusVenda.ABERTA)
      } finally {
        await outra.encerrar()
      }
    })
  })
})
