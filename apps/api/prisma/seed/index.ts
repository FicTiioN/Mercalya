import {
  ControleValidade,
  FormaPagamento,
  MotivoPerda,
  PapelUsuario,
  PrismaClient,
  StatusCompra,
  StatusFornecedor,
  StatusMovimentacao,
  StatusPagamento,
  StatusProduto,
  TipoLocal,
  TipoMovimentacao,
  UnidadeMedida,
} from '@prisma/client'
import { hashSync } from 'bcryptjs'
import { textoDeBusca, textoDeBuscaFornecedor } from '../../src/comum/texto'
import {
  ADMIN,
  categorias,
  compras,
  configuracoesLoja,
  EMPRESA_ID,
  fornecedores,
  LOCAL_CENTRAL_ID,
  LOCAL_LOJA_ID,
  LOJA_ID,
  lotes,
  marcas,
  movimentacoes,
  perdas,
  produtos,
  saldos,
  sequencias,
  vendas,
  vendasNaoAtendidas,
} from './dados'

const prisma = new PrismaClient()

/**
 * Os enums do Prisma são o mesmo valor do contrato em caixa alta, com hífen
 * virando sublinhado (`erro-operacional` -> `ERRO_OPERACIONAL`). Uma função
 * dá conta de todos, em vez de um mapa por enum que envelhece sozinho.
 */
function paraEnum<T>(valor: string): T {
  return valor.toUpperCase().replace(/-/g, '_') as T
}

/** O seed é de demonstração: recria a base do zero, em ordem segura de FK. */
async function limpar() {
  await prisma.itemVenda.deleteMany()
  await prisma.venda.deleteMany()
  await prisma.cliente.deleteMany()
  await prisma.perdaEstoque.deleteMany()
  await prisma.itemAbastecimento.deleteMany()
  await prisma.abastecimento.deleteMany()
  await prisma.movimentacaoEstoque.deleteMany()
  await prisma.saldoEstoque.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.itemCompra.deleteMany()
  await prisma.compra.deleteMany()
  await prisma.configuracaoProdutoLoja.deleteMany()
  await prisma.produto.deleteMany()
  await prisma.fornecedor.deleteMany()
  await prisma.marca.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.localEstoque.deleteMany()
  await prisma.loja.deleteMany()
  await prisma.sequencia.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.empresa.deleteMany()
}

async function main() {
  console.log('Limpando a base (seed de demonstração recria tudo)...')
  await limpar()

  await prisma.empresa.create({
    data: { id: EMPRESA_ID, nome: 'Mercalya Demonstração', documento: '00000000000191' },
  })

  await prisma.usuario.create({
    data: {
      id: ADMIN.id,
      empresaId: EMPRESA_ID,
      nome: ADMIN.nome,
      email: ADMIN.email,
      senhaHash: hashSync(ADMIN.senha, 10),
      papel: PapelUsuario.ADMINISTRADOR,
    },
  })

  await prisma.loja.create({
    data: {
      id: LOJA_ID,
      empresaId: EMPRESA_ID,
      nome: 'Mercadinho - Térreo',
      condominio: 'Residencial Parque Verde',
    },
  })

  await prisma.localEstoque.createMany({
    data: [
      {
        id: LOCAL_CENTRAL_ID,
        empresaId: EMPRESA_ID,
        nome: 'Estoque central',
        tipo: TipoLocal.CENTRAL,
        descricao: 'Central de Estoque — Matriz',
        lojaId: null,
      },
      {
        id: LOCAL_LOJA_ID,
        empresaId: EMPRESA_ID,
        nome: 'Mercadinho - Térreo',
        tipo: TipoLocal.LOJA,
        descricao: 'Loja do condomínio Residencial Parque Verde',
        lojaId: LOJA_ID,
      },
    ],
  })

  await prisma.categoria.createMany({
    data: categorias.map((c) => ({ ...c, empresaId: EMPRESA_ID })),
  })

  await prisma.marca.createMany({
    data: marcas.map((m) => ({ ...m, empresaId: EMPRESA_ID })),
  })

  await prisma.fornecedor.createMany({
    data: fornecedores.map((f) => ({
      id: f.id,
      empresaId: EMPRESA_ID,
      nome: f.nome,
      nomeFantasia: f.nomeFantasia,
      documento: f.documento,
      categoriaPrincipalId: f.categoriaPrincipalId,
      contatoNome: f.contato.nome,
      contatoCargo: f.contato.cargo,
      contatoTelefone: f.contato.telefone,
      contatoWhatsapp: f.contato.whatsapp,
      contatoEmail: f.contato.email,
      enderecoCep: f.endereco.cep,
      enderecoLogradouro: f.endereco.logradouro,
      enderecoNumero: f.endereco.numero,
      enderecoComplemento: f.endereco.complemento,
      enderecoBairro: f.endereco.bairro,
      enderecoCidade: f.endereco.cidade,
      enderecoUf: f.endereco.uf,
      prazoEntregaDias: f.comercial.prazoEntregaDias,
      condicaoPagamento: f.comercial.condicaoPagamento,
      descontoPadrao: f.comercial.descontoPadrao,
      observacoes: f.observacoes,
      status: paraEnum<StatusFornecedor>(f.status),
      buscaTexto: textoDeBuscaFornecedor(f),
      criadoEm: f.criadoEm,
    })),
  })

  await prisma.produto.createMany({
    data: produtos.map((p) => ({
      id: p.id,
      empresaId: EMPRESA_ID,
      nome: p.nome,
      ean: p.ean || null,
      sku: p.sku || null,
      categoriaId: p.categoriaId,
      marcaId: p.marcaId,
      unidade: paraEnum<UnidadeMedida>(p.unidade),
      conteudo: p.conteudo,
      precoSugerido: p.precoSugerido,
      custoMedio: p.custoMedio,
      pontoCompra: p.pontoCompra,
      estoqueMaximoCentral: p.estoqueMaximoCentral,
      controleValidade: paraEnum<ControleValidade>(p.controleValidade),
      validadePadraoDias: p.validadePadraoDias,
      localizacaoPadrao: p.localizacaoPadrao,
      fornecedorPrincipalId: p.fornecedorPrincipalId,
      observacoes: p.observacoes,
      imagem: p.imagem,
      status: paraEnum<StatusProduto>(p.status),
      buscaTexto: textoDeBusca(p),
      criadoEm: p.criadoEm,
      ultimaVendaEm: p.ultimaVendaEm,
    })),
  })

  await prisma.configuracaoProdutoLoja.createMany({ data: configuracoesLoja })

  await prisma.compra.createMany({
    data: compras.map((c) => ({
      id: c.id,
      empresaId: EMPRESA_ID,
      numero: c.numero,
      fornecedorId: c.fornecedorId,
      notaFiscal: c.notaFiscal,
      dataEmissao: c.dataEmissao,
      dataEntrada: c.dataEntrada,
      condicaoPagamento: c.condicaoPagamento,
      formaPagamento: paraEnum<FormaPagamento>(c.formaPagamento),
      dataVencimento: c.dataVencimento,
      observacoes: c.observacoes,
      frete: c.frete,
      desconto: c.desconto,
      subtotal: c.subtotal,
      total: c.total,
      localDestinoId: c.localDestinoId,
      status: paraEnum<StatusCompra>(c.status),
      confirmadaEm: c.criadoEm,
      criadoEm: c.criadoEm,
    })),
  })

  await prisma.itemCompra.createMany({
    data: compras.flatMap((c) =>
      c.itens.map((i) => ({
        id: i.id,
        compraId: c.id,
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        unidade: paraEnum<UnidadeMedida>(i.unidade),
        custoUnitario: i.custoUnitario,
        validade: i.validade,
        lote: i.lote,
        total: i.total,
      })),
    ),
  })

  await prisma.lote.createMany({
    data: lotes.map((l) => ({ ...l, empresaId: EMPRESA_ID })),
  })

  await prisma.saldoEstoque.createMany({
    data: saldos.map((s) => ({ ...s, empresaId: EMPRESA_ID })),
  })

  await prisma.movimentacaoEstoque.createMany({
    data: movimentacoes.map((m) => ({
      id: m.id,
      empresaId: EMPRESA_ID,
      tipo: paraEnum<TipoMovimentacao>(m.tipo),
      produtoId: m.produtoId,
      loteId: m.loteId,
      quantidade: m.quantidade,
      origemId: m.origemId,
      origemLabel: m.origemLabel,
      destinoId: m.destinoId,
      destinoLabel: m.destinoLabel,
      usuario: m.usuario,
      observacao: m.observacao,
      documento: m.documento,
      custoUnitario: m.custoUnitario,
      valorTotal: m.valorTotal,
      data: m.data,
      status: paraEnum<StatusMovimentacao>(m.status),
    })),
  })

  await prisma.perdaEstoque.createMany({
    data: perdas.map((p) => ({
      id: p.id,
      empresaId: EMPRESA_ID,
      produtoId: p.produtoId,
      loteId: p.loteId,
      localId: p.localId,
      motivo: paraEnum<MotivoPerda>(p.motivo),
      quantidade: p.quantidade,
      valor: p.valor,
      observacao: p.observacao,
      registradoPor: p.registradoPor,
      data: p.data,
    })),
  })

  await prisma.venda.createMany({
    data: vendas.map((v) => ({
      id: v.id,
      empresaId: EMPRESA_ID,
      numero: v.numero,
      lojaId: v.lojaId,
      clienteNome: v.clienteNome,
      operador: v.operador,
      data: v.data,
      subtotal: v.subtotal,
      desconto: v.desconto,
      acrescimo: v.acrescimo,
      total: v.total,
      troco: v.troco,
      pagamentoForma: paraEnum(v.pagamento.forma),
      pagamentoValor: v.pagamento.valorPago,
      pagamentoStatus: paraEnum<StatusPagamento>(v.pagamento.status),
      pagamentoQuando: v.pagamento.quando,
      tipoVenda: v.tipoVenda,
      canal: v.canal,
      observacao: v.observacao,
      status: paraEnum(v.status),
      canceladaEm: v.status === 'cancelada' ? v.atualizadoEm : null,
      criadoEm: v.registradoEm,
    })),
  })

  await prisma.itemVenda.createMany({
    data: vendas.flatMap((v) =>
      v.itens.map((i) => ({
        id: i.id,
        vendaId: v.id,
        produtoId: i.produtoId,
        produtoNome: i.produtoNome,
        ean: i.ean,
        imagem: i.imagem,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        total: i.total,
      })),
    ),
  })

  await prisma.sequencia.createMany({
    data: sequencias.map((s) => ({ ...s, empresaId: EMPRESA_ID })),
  })

  const totalCentral = saldos
    .filter((s) => s.localId === LOCAL_CENTRAL_ID)
    .reduce((acc, s) => acc + s.quantidade, 0)
  const totalLoja = saldos
    .filter((s) => s.localId === LOCAL_LOJA_ID)
    .reduce((acc, s) => acc + s.quantidade, 0)

  console.log('Seed concluído.')
  console.log(`  categorias ....... ${categorias.length}`)
  console.log(`  marcas ........... ${marcas.length}`)
  console.log(`  fornecedores ..... ${fornecedores.length}`)
  console.log(`  produtos ......... ${produtos.length}`)
  console.log(`  compras .......... ${compras.length}`)
  console.log(`  lotes ............ ${lotes.length}`)
  console.log(`  saldos ........... ${saldos.length}`)
  console.log(`  movimentações .... ${movimentacoes.length}`)
  console.log(`  perdas ........... ${perdas.length}`)
  console.log(`  vendas ........... ${vendas.length}`)
  console.log(`  estoque central .. ${totalCentral}`)
  console.log(`  estoque loja ..... ${totalLoja}`)
  console.log(`  total geral ...... ${totalCentral + totalLoja}`)
  console.log(`  login ............ ${ADMIN.email} / ${ADMIN.senha}`)
  if (vendasNaoAtendidas.length > 0) {
    console.warn(`  ATENCAO: ${vendasNaoAtendidas.length} itens de venda sem saldo suficiente:`)
    vendasNaoAtendidas.slice(0, 10).forEach((v) => console.warn(`    - ${v}`))
  }
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
