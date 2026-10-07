import { ConflictException } from '@nestjs/common'
import { TipoLocal } from '@prisma/client'
import { Cenario, daqui, OPERADOR } from './cenario'

describe('Lojas — várias por empresa, estoque central único', () => {
  let c: Cenario

  beforeAll(async () => {
    c = await Cenario.montar()
  })

  afterAll(() => c.encerrar())

  it('criar loja cria a prateleira dela no mesmo commit; nome repetido é recusado', async () => {
    const loja = await c.lojas.criar(c.empresaId, { nome: 'Bloco B', condominio: 'Parque Verde' })
    expect(loja).toMatchObject({ nome: 'Bloco B', condominio: 'Parque Verde', ativa: true })

    const local = await c.prisma.localEstoque.findUnique({ where: { lojaId: loja.id } })
    expect(local).toMatchObject({ tipo: TipoLocal.LOJA, nome: 'Bloco B', empresaId: c.empresaId })

    await expect(c.lojas.criar(c.empresaId, { nome: 'bloco b' })).rejects.toThrow(
      /Já existe uma loja/,
    )

    const todas = await c.lojas.listar(c.empresaId)
    expect(todas.map((l) => l.nome)).toEqual(['Bloco B', 'Loja de teste'])
  })

  it('renomear a loja renomeia a prateleira; não desativa a última ativa', async () => {
    const outra = await Cenario.montar()
    try {
      const [unica] = await outra.lojas.listar(outra.empresaId)

      const renomeada = await outra.lojas.atualizar(outra.empresaId, unica.id, { nome: 'Térreo' })
      expect(renomeada.nome).toBe('Térreo')
      const local = await outra.prisma.localEstoque.findUnique({ where: { lojaId: unica.id } })
      expect(local?.nome).toBe('Térreo')

      await expect(
        outra.lojas.atualizar(outra.empresaId, unica.id, { ativa: false }),
      ).rejects.toThrow(/ao menos uma loja ativa/)

      // Com uma segunda ativa, a primeira pode sair.
      await outra.lojas.criar(outra.empresaId, { nome: 'Anexo' })
      const desativada = await outra.lojas.atualizar(outra.empresaId, unica.id, { ativa: false })
      expect(desativada.ativa).toBe(false)
    } finally {
      await outra.encerrar()
    }
  })

  it('estoque e venda da loja B não tocam na loja A; sem loja informada, vai a primeira ativa', async () => {
    const lojaB = await c.lojas.criar(c.empresaId, { nome: 'Loja B' })
    const localB = (await c.prisma.localEstoque.findUniqueOrThrow({ where: { lojaId: lojaB.id } })).id

    // Produto à venda nas duas lojas, com preços diferentes.
    const p = await c.criarProduto('Guaraná', { precoVenda: 6 })
    await c.prisma.configuracaoProdutoLoja.create({
      data: { produtoId: p.id, lojaId: lojaB.id, precoVenda: 7.5 },
    })
    await c.comprar([{ produtoId: p.id, quantidade: 20, custoUnitario: 2, validade: daqui(30) }])

    await c.abastecer([{ produtoId: p.id, quantidade: 5 }])
    await c.estoque.abastecer(c.empresaId, OPERADOR, {
      lojaId: lojaB.id,
      itens: [{ produtoId: p.id, quantidade: 7 }],
    })
    expect(await c.saldo(p.id)).toBe(5)
    expect(await c.saldo(p.id, localB)).toBe(7)
    expect(await c.saldo(p.id, c.centralId)).toBe(8)

    // Venda na B: preço da B, saldo da B.
    const { venda } = await c.vender({
      lojaId: lojaB.id,
      itens: [{ produtoId: p.id, quantidade: 3 }],
      pagamentos: [{ forma: 'pix', valor: 22.5 }],
    })
    expect(venda.lojaId).toBe(lojaB.id)
    expect(venda.itens[0].precoUnitario).toBe(7.5)
    expect(await c.saldo(p.id, localB)).toBe(4)
    expect(await c.saldo(p.id)).toBe(5)

    // Sem loja: a primeira ativa (a de teste, criada antes) — preço 6.
    const semLoja = await c.vendas.registrar(c.empresaId, OPERADOR, {
      itens: [{ produtoId: p.id, quantidade: 1 }],
      pagamentos: [{ forma: 'dinheiro', valor: 6 }],
    })
    expect(semLoja.venda.lojaId).toBe(c.lojaId)
    expect(semLoja.venda.itens[0].precoUnitario).toBe(6)
    expect(await c.saldo(p.id)).toBe(4)
    expect(await c.saldo(p.id, localB)).toBe(4)

    // A listagem da loja B mostra o saldo dela, não o da A.
    const lista = await c.prisma.saldoEstoque.groupBy({
      by: ['localId'],
      where: { produtoId: p.id },
      _sum: { quantidade: true },
    })
    expect(Object.fromEntries(lista.map((l) => [l.localId, l._sum.quantidade?.toNumber()]))).toEqual({
      [c.localLojaId]: 4,
      [localB]: 4,
      [c.centralId]: 8,
    })
  })

  it('loja inativa não recebe venda', async () => {
    const lojaC = await c.lojas.criar(c.empresaId, { nome: 'Loja C' })
    const p = await c.criarProduto('Refresco', { precoVenda: 3 })
    await c.prisma.configuracaoProdutoLoja.create({
      data: { produtoId: p.id, lojaId: lojaC.id, precoVenda: 3 },
    })
    await c.lojas.atualizar(c.empresaId, lojaC.id, { ativa: false })

    await expect(
      c.vender({
        lojaId: lojaC.id,
        itens: [{ produtoId: p.id, quantidade: 1 }],
        pagamentos: [{ forma: 'dinheiro', valor: 3 }],
      }),
    ).rejects.toThrow(/Loja não encontrada/)

    await expect(
      c.lojas.atualizar(c.empresaId, 'nao-existe', { nome: 'X' }),
    ).rejects.toThrow(/não encontrada/)
    await expect(c.lojas.criar(c.empresaId, { nome: '   ' })).rejects.toThrow(ConflictException)
  })
})
