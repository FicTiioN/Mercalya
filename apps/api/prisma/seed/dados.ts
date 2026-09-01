/**
 * Dados de demonstração do Mercalya — porte dos mocks do frontend.
 *
 * Duas diferenças deliberadas em relação a `apps/web/src/mocks`:
 *
 * 1. **As datas são ancoradas no momento em que o seed roda**, não em uma data
 *    fixa. Indicadores como "sem giro há 30 dias" e "próximos vencimentos"
 *    perderiam o sentido se a base envelhecesse parada no tempo.
 * 2. **O EAN do iogurte foi corrigido.** No mock, `prd-016` e `prd-018`
 *    compartilhavam `7896023900123` — em memória ninguém percebia, mas o
 *    índice único do banco rejeita. Código de barras identifica o produto.
 *
 * Os IDs (`cat-*`, `prd-*`, `loja-001`) são preservados: enquanto os demais
 * módulos ainda leem os mocks, os dois lados precisam falar a mesma língua.
 */
import type {
  Categoria,
  Compra,
  Fornecedor,
  ItemCompra,
  Lote,
  Marca,
  MovimentacaoEstoque,
  PerdaEstoque,
  Produto,
  SaldoEstoque,
  Venda,
} from '@mercalya/domain'

export const EMPRESA_ID = 'emp-mercalya'
export const LOCAL_CENTRAL_ID = 'loc-central'
export const LOCAL_LOJA_ID = 'loc-loja-terreo'
export const LOJA_ID = 'loja-001'

export const ADMIN = {
  id: 'usr-001',
  nome: 'João Silva',
  email: 'admin@mercalya.com.br',
  senha: 'mercalya',
}

/** Hoje às 9h — âncora de todo o histórico gerado abaixo. */
const REFERENCIA = (() => {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  return d
})()

function dias(offset: number): Date {
  const d = new Date(REFERENCIA)
  d.setDate(d.getDate() + offset)
  return d
}

function iso(offset: number, hora = 9, minuto = 0): string {
  const d = dias(offset)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

/** Data sem hora, mas em ISO completo — o Prisma espera DateTime. */
function dataDia(offset: number): string {
  const d = dias(offset)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export const categorias: Categoria[] = [
  { id: 'cat-bebidas', nome: 'Bebidas', cor: '#087F73', emoji: '🥤' },
  { id: 'cat-alimentos', nome: 'Alimentos', cor: '#3979E9', emoji: '🍚' },
  { id: 'cat-higiene', nome: 'Higiene e Limpeza', cor: '#F4A629', emoji: '🧴' },
  { id: 'cat-snacks', nome: 'Snacks e Doces', cor: '#8B6FE0', emoji: '🍫' },
  { id: 'cat-padaria', nome: 'Padaria', cor: '#D68A0F', emoji: '🍞' },
  { id: 'cat-laticinios', nome: 'Laticínios', cor: '#18A66A', emoji: '🥛' },
  { id: 'cat-frios', nome: 'Frios', cor: '#E5484D', emoji: '🧀' },
  { id: 'cat-mercearia', nome: 'Mercearia', cor: '#65747E', emoji: '🛒' },
]

export const marcas: Marca[] = [
  { id: 'mar-cocacola', nome: 'Coca-Cola' },
  { id: 'mar-nestle', nome: 'Nestlé' },
  { id: 'mar-itambe', nome: 'Itambé' },
  { id: 'mar-omo', nome: 'OMO' },
  { id: 'mar-tiojoao', nome: 'Tio João' },
  { id: 'mar-liza', nome: 'Liza' },
  { id: 'mar-pullman', nome: 'Pullman' },
  { id: 'mar-seara', nome: 'Seara' },
  { id: 'mar-neve', nome: 'Neve' },
  { id: 'mar-ambev', nome: 'Ambev' },
]

type ProdutoSeed = [
  id: string,
  nome: string,
  ean: string,
  categoriaId: string,
  marcaId: string | null,
  unidade: Produto['unidade'],
  conteudo: string,
  precoSugerido: number,
  pontoCompra: number,
  maximoCentral: number,
  emoji: string,
  local: string,
  fornecedorId: string,
  diasUltimaVenda: number | null,
]

const seedsProduto: ProdutoSeed[] = [
  ['prd-001', 'Coca-Cola 2L', '7894900011517', 'cat-bebidas', 'mar-cocacola', 'un', '2L', 8.99, 24, 240, '🥤', 'Corredor A - Prateleira 01', 'for-001', 1],
  ['prd-002', 'Pão de Forma Tradicional', '7891234567890', 'cat-padaria', 'mar-pullman', 'un', '500g', 6.49, 12, 90, '🍞', 'Corredor B - Prateleira 02', 'for-005', 1],
  ['prd-003', 'Leite Integral 1L', '7894321098765', 'cat-laticinios', 'mar-itambe', 'un', '1L', 5.49, 48, 400, '🥛', 'Corredor B - Prateleira 03', 'for-006', 1],
  ['prd-004', 'Arroz Tipo 1 5kg', '7891112223334', 'cat-mercearia', 'mar-tiojoao', 'un', '5kg', 24.9, 12, 120, '🍚', 'Corredor A - Prateleira 02', 'for-002', 2],
  ['prd-005', 'Sabão em Pó OMO 1kg', '7896026543210', 'cat-higiene', 'mar-omo', 'un', '1kg', 13.9, 12, 100, '🧼', 'Corredor D - Prateleira 01', 'for-003', 2],
  ['prd-006', 'Óleo de Soja 900ml', '7896076801234', 'cat-mercearia', 'mar-liza', 'un', '900ml', 7.49, 18, 150, '🫗', 'Corredor B - Prateleira 02', 'for-002', 3],
  ['prd-007', 'Chocolate Ao Leite 90g', '7891000100100', 'cat-snacks', 'mar-nestle', 'un', '90g', 8.39, 20, 160, '🍫', 'Corredor C - Prateleira 02', 'for-004', 1],
  ['prd-008', 'Papel Higiênico Folha Dupla 12un', '7896102500011', 'cat-higiene', 'mar-neve', 'pct', '12 rolos', 16.9, 24, 180, '🧻', 'Corredor D - Prateleira 02', 'for-003', 2],
  ['prd-009', 'Feijão Carioca 1kg', '7896031005678', 'cat-mercearia', 'mar-tiojoao', 'un', '1kg', 7.8, 20, 160, '🫘', 'Corredor C - Prateleira 01', 'for-002', 2],
  ['prd-010', 'Açúcar Refinado 1kg', '7897892002221', 'cat-mercearia', null, 'un', '1kg', 4.99, 24, 200, '🍬', 'Corredor C - Prateleira 03', 'for-002', 3],
  ['prd-011', 'Detergente Líquido 500ml', '7896013103335', 'cat-higiene', null, 'un', '500ml', 2.89, 30, 240, '🧴', 'Corredor D - Prateleira 01', 'for-003', 2],
  ['prd-012', 'Molho de Tomate 340g', '7893000100123', 'cat-mercearia', null, 'un', '340g', 3.99, 24, 200, '🥫', 'Corredor C - Prateleira 02', 'for-002', 4],
  ['prd-013', 'Biscoito Maisena 400g', '7891000245678', 'cat-snacks', 'mar-nestle', 'un', '400g', 5.49, 20, 160, '🍪', 'Corredor A - Prateleira 03', 'for-004', 2],
  ['prd-014', 'Água Mineral 500ml', '7891910001112', 'cat-bebidas', null, 'un', '500ml', 2.5, 60, 480, '💧', 'Corredor A - Prateleira 01', 'for-001', 1],
  ['prd-015', 'Refrigerante Guaraná 2L', '7891991010924', 'cat-bebidas', 'mar-ambev', 'un', '2L', 7.99, 24, 200, '🥤', 'Corredor A - Prateleira 01', 'for-001', 1],
  ['prd-016', 'Queijo Mussarela 150g', '7896023900123', 'cat-frios', 'mar-seara', 'un', '150g', 7.99, 12, 80, '🧀', 'Geladeira 2 - Frios', 'for-006', 2],
  ['prd-017', 'Presunto Fatiado 150g', '7896023900456', 'cat-frios', 'mar-seara', 'un', '150g', 6.99, 12, 80, '🥓', 'Geladeira 2 - Frios', 'for-006', 3],
  // EAN corrigido: no mock colidia com o do queijo (prd-016).
  ['prd-018', 'Iogurte Natural 170g', '7896023900130', 'cat-laticinios', 'mar-itambe', 'un', '170g', 4.49, 24, 160, '🥣', 'Geladeira 1 - Laticínios', 'for-006', 1],
  ['prd-019', 'Manteiga 200g', '7891000300456', 'cat-laticinios', 'mar-itambe', 'un', '200g', 8.9, 12, 80, '🧈', 'Geladeira 1 - Laticínios', 'for-006', 3],
  ['prd-020', 'Café Torrado 500g', '7896005600789', 'cat-mercearia', null, 'un', '500g', 18.9, 12, 100, '☕', 'Corredor B - Prateleira 01', 'for-002', 2],
  ['prd-021', 'Macarrão Espaguete 500g', '7896005601234', 'cat-mercearia', null, 'un', '500g', 4.29, 24, 200, '🍝', 'Corredor C - Prateleira 01', 'for-002', 3],
  ['prd-022', 'Achocolatado em Pó 400g', '7891000401234', 'cat-snacks', 'mar-nestle', 'un', '400g', 9.9, 18, 140, '🍫', 'Corredor A - Prateleira 03', 'for-004', 2],
  ['prd-023', 'Suco de Laranja 1L', '7891991020123', 'cat-bebidas', null, 'un', '1L', 8.49, 18, 140, '🧃', 'Geladeira 1 - Bebidas', 'for-001', 2],
  ['prd-024', 'Cerveja Lata 350ml', '7891991000123', 'cat-bebidas', 'mar-ambev', 'un', '350ml', 4.29, 48, 480, '🍺', 'Geladeira 1 - Bebidas', 'for-001', 1],
  ['prd-025', 'Amaciante 2L', '7896013200456', 'cat-higiene', null, 'un', '2L', 14.9, 12, 100, '🧴', 'Corredor D - Prateleira 03', 'for-003', 4],
  ['prd-026', 'Desinfetante 1L', '7896013200789', 'cat-higiene', null, 'un', '1L', 6.9, 18, 140, '🧽', 'Corredor D - Prateleira 03', 'for-003', 3],
  ['prd-027', 'Salgadinho de Milho 90g', '7892840812345', 'cat-snacks', null, 'un', '90g', 6.49, 24, 200, '🌽', 'Corredor A - Prateleira 03', 'for-004', 1],
  ['prd-028', 'Bala de Goma 100g', '7891000502345', 'cat-snacks', null, 'un', '100g', 4.99, 24, 180, '🍬', 'Corredor A - Prateleira 03', 'for-004', 5],
  ['prd-029', 'Bolo de Chocolate Fatia', '7891234500123', 'cat-padaria', 'mar-pullman', 'un', '80g', 5.99, 10, 60, '🍰', 'Corredor B - Prateleira 02', 'for-005', 2],
  ['prd-030', 'Pão Francês kg', '7891234500456', 'cat-padaria', null, 'kg', '1kg', 18.9, 5, 40, '🥖', 'Corredor B - Prateleira 02', 'for-005', 1],
  ['prd-031', 'Chocolate Amargo 70% 80g', '7891000700123', 'cat-snacks', 'mar-nestle', 'un', '80g', 11.9, 8, 60, '🍫', 'Corredor A - Prateleira 03', 'for-004', 62],
  ['prd-032', 'Granola Zero Açúcar 300g', '7896005700456', 'cat-alimentos', null, 'un', '300g', 17.9, 8, 50, '🥣', 'Corredor B - Prateleira 01', 'for-002', 58],
  ['prd-033', 'Chá Verde 20 sachês', '7896005700789', 'cat-alimentos', null, 'cx', '20 sachês', 9.9, 8, 50, '🍵', 'Corredor B - Prateleira 01', 'for-002', 51],
  ['prd-034', 'Molho Inglês 150ml', '7893000200456', 'cat-mercearia', null, 'un', '150ml', 7.9, 6, 40, '🫙', 'Corredor C - Prateleira 02', 'for-002', 78],
  ['prd-035', 'Biscoito Integral 170g', '7891000800123', 'cat-alimentos', null, 'un', '170g', 6.9, 10, 60, '🍘', 'Corredor A - Prateleira 03', 'for-004', 84],
  ['prd-036', 'Farinha de Trigo 1kg', '7896005800123', 'cat-mercearia', null, 'un', '1kg', 5.49, 18, 140, '🌾', 'Corredor C - Prateleira 03', 'for-002', 5],
  ['prd-037', 'Sal Refinado 1kg', '7896005800456', 'cat-mercearia', null, 'un', '1kg', 2.49, 18, 140, '🧂', 'Corredor C - Prateleira 03', 'for-002', 6],
  ['prd-038', 'Esponja de Aço 8un', '7896013300123', 'cat-higiene', null, 'pct', '8 un', 3.99, 18, 140, '🧽', 'Corredor D - Prateleira 02', 'for-003', 4],
  ['prd-039', 'Linguiça Toscana 500g', '7896023901234', 'cat-frios', 'mar-seara', 'un', '500g', 19.9, 8, 60, '🌭', 'Freezer 1 - Congelados', 'for-006', 3],
  ['prd-040', 'Pizza Congelada 460g', '7896023902345', 'cat-frios', 'mar-seara', 'un', '460g', 22.9, 6, 50, '🍕', 'Freezer 1 - Congelados', 'for-006', 4],
]

const CATEGORIAS_PERECIVEIS = ['cat-frios', 'cat-laticinios', 'cat-padaria']

export const produtos: Produto[] = seedsProduto.map(
  (
    [
      id,
      nome,
      ean,
      categoriaId,
      marcaId,
      unidade,
      conteudo,
      precoSugerido,
      pontoCompra,
      estoqueMaximoCentral,
      emoji,
      localizacaoPadrao,
      fornecedorPrincipalId,
      diasUltimaVenda,
    ],
    index,
  ) => ({
    id,
    nome,
    ean,
    sku: `PRD${String(index + 1).padStart(3, '0')}`,
    categoriaId,
    marcaId,
    unidade,
    conteudo,
    precoSugerido,
    // Calculado adiante, a partir dos lotes das compras.
    custoMedio: null,
    pontoCompra,
    estoqueMaximoCentral,
    controleValidade: CATEGORIAS_PERECIVEIS.includes(categoriaId) ? 'obrigatorio' : 'por-lote',
    validadePadraoDias: CATEGORIAS_PERECIVEIS.includes(categoriaId) ? 30 : 365,
    localizacaoPadrao,
    fornecedorPrincipalId,
    observacoes: '',
    imagem: emoji,
    status: id === 'prd-034' ? 'inativo' : 'ativo',
    criadoEm: iso(-(180 - index * 3)),
    ultimaVendaEm: diasUltimaVenda === null ? null : iso(-diasUltimaVenda),
  }),
)

/* ------------------------------------------------------------------ */
/* Fornecedores                                                        */
/* ------------------------------------------------------------------ */

type FornecedorSeed = [
  id: string,
  nome: string,
  fantasia: string,
  cnpj: string,
  categoriaId: string,
  contato: string,
  cargo: string,
  telefone: string,
  email: string,
  cidade: string,
  uf: string,
  prazo: number,
  condicao: string,
  ativo: boolean,
]

const seedsFornecedor: FornecedorSeed[] = [
  ['for-001', 'Distribuidora Bom Preço', 'Bom Preço Distribuidora', '12.345.678/0001-90', 'cat-bebidas', 'Carlos Eduardo', 'Gerente comercial', '(11) 3333-4444', 'comercial@bompreco.com.br', 'São Paulo', 'SP', 3, '30 dias', true],
  ['for-002', 'Alimentos Central Ltda.', 'Central Alimentos', '98.765.432/0001-10', 'cat-mercearia', 'Ana Beatriz', 'Representante', '(19) 3111-2222', 'vendas@centralalimentos.com.br', 'Campinas', 'SP', 5, '28 dias', true],
  ['for-003', 'Higiene & Limpeza Brasil', 'HL Brasil', '07.654.321/0001-20', 'cat-higiene', 'Roberto Lima', 'Consultor', '(11) 3999-8888', 'contato@hlbrasil.com.br', 'São Paulo', 'SP', 4, '30 dias', true],
  ['for-004', 'Snacks & Cia', 'Snacks Cia', '15.753.951/0001-30', 'cat-snacks', 'Juliana Prado', 'Executiva de contas', '(11) 3687-1212', 'juliana@snackscia.com.br', 'Osasco', 'SP', 7, '21 dias', true],
  ['for-005', 'Padaria São José', 'São José Panificados', '22.222.222/0001-40', 'cat-padaria', 'Marcos Vinícius', 'Proprietário', '(11) 2468-1357', 'pedidos@saojose.com.br', 'Guarulhos', 'SP', 1, 'À vista', true],
  ['for-006', 'Laticínios Bom Sabor', 'Bom Sabor', '33.444.555/0001-50', 'cat-laticinios', 'Fernanda Rocha', 'Gerente de vendas', '(11) 4123-9876', 'fernanda@bomsabor.com.br', 'São Bernardo', 'SP', 2, '15 dias', true],
  ['for-007', 'Carnes do Sul', 'Carnes Sul', '44.555.666/0001-60', 'cat-frios', 'Paulo Henrique', 'Vendedor', '(11) 4999-2211', 'paulo@carnesdosul.com.br', 'Santo André', 'SP', 3, '21 dias', true],
  ['for-008', 'Bebidas Premium', 'Premium Bebidas', '55.666.777/0001-70', 'cat-bebidas', 'Camila Duarte', 'Coordenadora', '(11) 3255-7788', 'camila@bebidaspremium.com.br', 'São Paulo', 'SP', 4, '30 dias', true],
  ['for-009', 'Embalagens Paulista', 'Embalagens SP', '66.777.888/0001-80', 'cat-higiene', 'Rogério Alves', 'Comercial', '(11) 4587-6633', 'rogerio@embalagenspaulista.com.br', 'Jundiaí', 'SP', 6, '30 dias', false],
  ['for-010', 'Distribuidora Paraná', 'Paraná Distribuição', '77.888.999/0001-90', 'cat-alimentos', 'Sandra Melo', 'Representante', '(41) 3022-5566', 'sandra@distparana.com.br', 'Curitiba', 'PR', 8, '45 dias', true],
  ['for-011', 'Grãos & Cia', 'Grãos Cia', '88.999.000/0001-00', 'cat-mercearia', 'Eduardo Nunes', 'Vendedor', '(44) 3123-6677', 'eduardo@graoscia.com.br', 'Maringá', 'PR', 10, '30 dias', false],
  ['for-012', 'Frios Express', 'Frios Express', '99.000.111/0001-11', 'cat-frios', 'Patrícia Souza', 'Gerente', '(11) 3777-4545', 'patricia@friosexpress.com.br', 'Diadema', 'SP', 2, '15 dias', true],
]

export const fornecedores: Fornecedor[] = seedsFornecedor.map(
  ([
    id,
    nome,
    nomeFantasia,
    documento,
    categoriaPrincipalId,
    contatoNome,
    cargo,
    telefone,
    email,
    cidade,
    uf,
    prazoEntregaDias,
    condicaoPagamento,
    ativo,
  ]) => ({
    id,
    nome,
    nomeFantasia,
    documento,
    categoriaPrincipalId,
    contato: {
      nome: contatoNome,
      cargo,
      telefone,
      whatsapp: telefone.replace(') ', ') 9'),
      email,
    },
    endereco: {
      cep: '01310-000',
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: '',
      bairro: 'Centro',
      cidade,
      uf,
    },
    comercial: { prazoEntregaDias, condicaoPagamento, descontoPadrao: 0 },
    observacoes: '',
    status: ativo ? 'ativo' : 'inativo',
    criadoEm: iso(-200),
  }),
)

/* ------------------------------------------------------------------ */
/* Configuração comercial por loja                                     */
/* ------------------------------------------------------------------ */

export const configuracoesLoja = produtos.map((produto) => {
  const minimo = Math.max(4, Math.round(produto.pontoCompra * 0.4))
  return {
    id: `cpl-${produto.id}-${LOJA_ID}`,
    produtoId: produto.id,
    lojaId: LOJA_ID,
    precoVenda: produto.precoSugerido,
    estoqueMinimo: minimo,
    estoqueIdeal: Math.max(minimo, Math.round(produto.estoqueMaximoCentral * 0.35)),
    ativo: produto.status === 'ativo',
  }
})

// ------------------------------------------------------------------
// Histórico de vendas
//
// Gerado antes das transferências de propósito: a loja precisa ter recebido
// o que foi vendido. Sem isso, uma venda de 29 dias atrás encontraria a
// prateleira vazia — a primeira transferência é de 16 dias atrás.
// ------------------------------------------------------------------

const TOTAL_VENDAS = 94

/** Gerador determinístico: o mesmo conjunto a cada seed. */
function criarSorteio(semente: number) {
  let estado = semente
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

const sorteio = criarSorteio(20260831)
const entre = (min: number, max: number) => min + Math.floor(sorteio() * (max - min + 1))
const escolher = <T>(lista: T[]): T => lista[Math.floor(sorteio() * lista.length)]

const clientesVenda = [
  'Consumidor final', 'Maria Aparecida', 'Carlos Oliveira', 'Juliana Santos',
  'Pedro Henrique', 'Fernanda Lima', 'Roberto Almeida', 'Beatriz Costa',
  'Lucas Ferreira', 'Patrícia Gomes', 'Rafael Souza',
  'Consumidor final', 'Consumidor final',
]
const operadoresVenda = ['João Silva', 'Ana Paula', 'Mariana Costa']
const formasPagamentoVenda: Venda['pagamento']['forma'][] = [
  'pix', 'pix', 'pix', 'pix', 'dinheiro', 'dinheiro',
  'cartao-credito', 'cartao-credito', 'cartao-debito',
]

/** Produtos vendáveis: ativos e com preço configurado na loja. */
const vendaveis = produtos
  .filter((p) => p.status === 'ativo')
  .map((produto) => {
    const config = configuracoesLoja.find((c) => c.produtoId === produto.id)
    return config && config.ativo ? { produto, preco: config.precoVenda } : null
  })
  .filter((v): v is { produto: Produto; preco: number } => v !== null)

function hexAleatorio(tamanho: number): string {
  let saida = ''
  for (let i = 0; i < tamanho; i += 1) saida += Math.floor(sorteio() * 16).toString(16)
  return saida
}
const idInterno = () =>
  `${hexAleatorio(8)}-${hexAleatorio(4)}-${hexAleatorio(4)}-${hexAleatorio(4)}-${hexAleatorio(12)}`

const arredondar2 = (valor: number) => Number(valor.toFixed(2))

export const vendas: Venda[] = Array.from({ length: TOTAL_VENDAS }, (_, indice) => {
  // Índice 0 é a venda mais antiga; a última é de hoje.
  const diasAtras = Math.floor((TOTAL_VENDAS - 1 - indice) / 3.2)
  const data = dias(-diasAtras)
  data.setHours(entre(8, 20), entre(0, 59), entre(0, 59), 0)

  const quantidadeItens = entre(1, 7)
  const escolhidos = new Set<string>()
  const itens: Venda['itens'] = []

  for (let i = 0; i < quantidadeItens; i += 1) {
    const vendavel = escolher(vendaveis)
    const quantidade = entre(1, 3)
    if (escolhidos.has(vendavel.produto.id)) continue
    escolhidos.add(vendavel.produto.id)

    itens.push({
      id: `itv-${indice}-${i}`,
      produtoId: vendavel.produto.id,
      produtoNome: vendavel.produto.nome,
      ean: vendavel.produto.ean,
      imagem: vendavel.produto.imagem,
      quantidade,
      precoUnitario: vendavel.preco,
      total: arredondar2(quantidade * vendavel.preco),
    })
  }

  const subtotal = arredondar2(itens.reduce((acc, i) => acc + i.total, 0))
  const desconto = sorteio() < 0.17 ? arredondar2(Math.min(subtotal * 0.08, 5)) : 0
  const total = arredondar2(subtotal - desconto)

  const forma = escolher(formasPagamentoVenda)
  const valorPago = forma === 'dinheiro' ? Math.ceil(total / 10) * 10 : total
  const cancelada = sorteio() < 0.035
  const operador = escolher(operadoresVenda)
  const registradoEm = data.toISOString()
  const atualizado = new Date(data)
  atualizado.setMinutes(atualizado.getMinutes() + (cancelada ? 12 : 1))

  return {
    id: `vnd-${String(indice + 1).padStart(4, '0')}`,
    numero: `VDA-${String(1000 + indice + 1).padStart(6, '0')}`,
    lojaId: LOJA_ID,
    data: registradoEm,
    clienteNome: escolher(clientesVenda),
    operador,
    itens,
    subtotal,
    desconto,
    acrescimo: 0,
    total,
    pagamento: {
      forma,
      valorPago,
      status: cancelada ? 'recusado' : 'aprovado',
      quando: registradoEm,
    },
    troco: forma === 'dinheiro' ? arredondar2(valorPago - total) : 0,
    tipoVenda: 'Venda presencial',
    canal: 'PDV',
    observacao: '',
    status: cancelada ? 'cancelada' : 'concluida',
    registradoEm,
    atualizadoEm: atualizado.toISOString(),
    idInterno: idInterno(),
  } satisfies Venda
}).filter((venda) => venda.itens.length > 0)

/**
 * Quanto cada produto precisa ter sido transferido a mais para cobrir as
 * vendas. Venda cancelada não consome estoque.
 */
const vendidoPorProduto = new Map<string, number>()
for (const venda of vendas) {
  if (venda.status === 'cancelada') continue
  for (const item of venda.itens) {
    vendidoPorProduto.set(
      item.produtoId,
      (vendidoPorProduto.get(item.produtoId) ?? 0) + item.quantidade,
    )
  }
}

/* ------------------------------------------------------------------ */
/* Estoque derivado de um histórico de compras                         */
/* ------------------------------------------------------------------ */

/** Custo unitário derivado do preço de venda por uma margem plausível. */
const margemPorCategoria: Record<string, number> = {
  'cat-bebidas': 0.32,
  'cat-alimentos': 0.3,
  'cat-higiene': 0.34,
  'cat-snacks': 0.36,
  'cat-padaria': 0.4,
  'cat-laticinios': 0.26,
  'cat-frios': 0.28,
  'cat-mercearia': 0.24,
}

const porId = new Map(produtos.map((p) => [p.id, p]))

function custoDe(produtoId: string): number {
  const p = porId.get(produtoId)
  if (!p) return 0
  const margem = margemPorCategoria[p.categoriaId] ?? 0.3
  return Number((p.precoSugerido * (1 - margem)).toFixed(2))
}

/**
 * Quanto comprar. Além do teto do central vezes o fator da compra, soma o que
 * será vendido no período — comprar menos do que se vende deixaria a prateleira
 * sem saldo e o histórico não fecharia.
 */
function quantidadeCompra(produtoId: string, fator: number): number {
  const p = porId.get(produtoId)
  if (!p) return 0
  const base = Math.max(6, Math.round((p.estoqueMaximoCentral * fator) / 6) * 6)
  const giro = vendidoPorProduto.get(produtoId) ?? 0
  return base + Math.ceil(giro / 6) * 6
}

const validadePorCategoria: Record<string, number> = {
  'cat-frios': 45,
  'cat-laticinios': 40,
  'cat-padaria': 20,
  'cat-snacks': 300,
  'cat-bebidas': 260,
  'cat-higiene': 700,
  'cat-mercearia': 420,
  'cat-alimentos': 300,
}

const compraSeeds = [
  { numero: 'CP-1201', fornecedorId: 'for-001', nf: '12555', diasAtras: 42, produtos: ['prd-001', 'prd-014', 'prd-015', 'prd-023', 'prd-024'], fator: 0.7 },
  { numero: 'CP-1202', fornecedorId: 'for-002', nf: '12560', diasAtras: 38, produtos: ['prd-004', 'prd-006', 'prd-009', 'prd-010', 'prd-012', 'prd-020', 'prd-021', 'prd-036', 'prd-037'], fator: 0.65 },
  { numero: 'CP-1203', fornecedorId: 'for-003', nf: '12563', diasAtras: 31, produtos: ['prd-005', 'prd-008', 'prd-011', 'prd-025', 'prd-026', 'prd-038'], fator: 0.6 },
  { numero: 'CP-1204', fornecedorId: 'for-004', nf: '12571', diasAtras: 24, produtos: ['prd-007', 'prd-013', 'prd-022', 'prd-027', 'prd-028', 'prd-031', 'prd-035'], fator: 0.55 },
  { numero: 'CP-1205', fornecedorId: 'for-006', nf: '12588', diasAtras: 12, produtos: ['prd-003', 'prd-016', 'prd-017', 'prd-018', 'prd-019', 'prd-039', 'prd-040'], fator: 0.6 },
  { numero: 'CP-1206', fornecedorId: 'for-005', nf: '12594', diasAtras: 5, produtos: ['prd-002', 'prd-029', 'prd-030'], fator: 0.5 },
  { numero: 'CP-1207', fornecedorId: 'for-002', nf: '12601', diasAtras: 2, produtos: ['prd-032', 'prd-033', 'prd-034'], fator: 0.45 },
]

export const compras: Compra[] = []
export const lotes: Lote[] = []
export const saldos: SaldoEstoque[] = []
export const movimentacoes: MovimentacaoEstoque[] = []
export const perdas: PerdaEstoque[] = []

let loteSeq = 0
let movSeq = 0

function novoIdMov(): string {
  movSeq += 1
  return `mov-${String(movSeq).padStart(4, '0')}`
}

compraSeeds.forEach((seed, ci) => {
  const compraId = `cmp-${String(ci + 1).padStart(3, '0')}`
  const itens: ItemCompra[] = []

  seed.produtos.forEach((produtoId, pi) => {
    const produto = porId.get(produtoId)
    if (!produto) return

    loteSeq += 1
    const custo = custoDe(produtoId)
    const qtd = quantidadeCompra(produtoId, seed.fator)
    const validadeDias = validadePorCategoria[produto.categoriaId] ?? 365
    const validade = dataDia(-seed.diasAtras + validadeDias)
    const loteId = `lot-${String(loteSeq).padStart(3, '0')}`
    const carimbo = dataDia(-seed.diasAtras).slice(2, 10).replace(/-/g, '')
    const loteCodigo = `L${carimbo}${String.fromCharCode(65 + (pi % 26))}`

    lotes.push({
      id: loteId,
      codigo: loteCodigo,
      produtoId,
      compraId,
      custoUnitario: custo,
      validade,
      criadoEm: iso(-seed.diasAtras, 9, 30),
    })

    itens.push({
      id: `itc-${compraId}-${pi}`,
      produtoId,
      quantidade: qtd,
      unidade: produto.unidade,
      custoUnitario: custo,
      validade,
      lote: loteCodigo,
      total: Number((qtd * custo).toFixed(2)),
    })

    saldos.push({
      id: `sld-${loteId}-central`,
      produtoId,
      loteId,
      localId: LOCAL_CENTRAL_ID,
      quantidade: qtd,
      reservado: 0,
      atualizadoEm: iso(-seed.diasAtras, 9, 30),
    })

    movimentacoes.push({
      id: novoIdMov(),
      tipo: 'ENTRADA',
      produtoId,
      loteId,
      quantidade: qtd,
      origemId: null,
      origemLabel: 'Fornecedor',
      destinoId: LOCAL_CENTRAL_ID,
      destinoLabel: 'Estoque central',
      usuario: ci % 2 === 0 ? 'João Silva' : 'Maria Santos',
      observacao: `Compra NF ${seed.nf}`,
      documento: `NF ${seed.nf}`,
      custoUnitario: custo,
      valorTotal: Number((qtd * custo).toFixed(2)),
      data: iso(-seed.diasAtras, 9, 30 + pi),
      status: 'concluida',
    })
  })

  const subtotal = Number(itens.reduce((acc, i) => acc + i.total, 0).toFixed(2))

  compras.push({
    id: compraId,
    numero: seed.numero,
    fornecedorId: seed.fornecedorId,
    notaFiscal: seed.nf,
    dataEmissao: dataDia(-seed.diasAtras - 1),
    dataEntrada: dataDia(-seed.diasAtras),
    condicaoPagamento: '30 dias',
    formaPagamento: 'boleto',
    dataVencimento: dataDia(-seed.diasAtras + 30),
    observacoes: '',
    itens,
    frete: 0,
    desconto: 0,
    subtotal,
    total: subtotal,
    localDestinoId: LOCAL_CENTRAL_ID,
    status: 'confirmada',
    criadoEm: iso(-seed.diasAtras, 9, 0),
  })
})

/* ----------------------- transferências para a loja ------------------ */

const transferencias = [
  { produtoId: 'prd-001', percentual: 0.22, diasAtras: 9 },
  { produtoId: 'prd-002', percentual: 0.34, diasAtras: 4 },
  { produtoId: 'prd-003', percentual: 0.24, diasAtras: 8 },
  { produtoId: 'prd-004', percentual: 0.12, diasAtras: 10 },
  { produtoId: 'prd-005', percentual: 0.18, diasAtras: 11 },
  { produtoId: 'prd-006', percentual: 0.2, diasAtras: 12 },
  { produtoId: 'prd-007', percentual: 0.3, diasAtras: 7 },
  { produtoId: 'prd-008', percentual: 0.16, diasAtras: 13 },
  { produtoId: 'prd-009', percentual: 0.2, diasAtras: 14 },
  { produtoId: 'prd-010', percentual: 0.22, diasAtras: 15 },
  { produtoId: 'prd-011', percentual: 0.24, diasAtras: 10 },
  { produtoId: 'prd-013', percentual: 0.26, diasAtras: 9 },
  { produtoId: 'prd-014', percentual: 0.2, diasAtras: 6 },
  { produtoId: 'prd-015', percentual: 0.22, diasAtras: 6 },
  { produtoId: 'prd-016', percentual: 0.3, diasAtras: 5 },
  { produtoId: 'prd-017', percentual: 0.28, diasAtras: 5 },
  { produtoId: 'prd-018', percentual: 0.34, diasAtras: 3 },
  { produtoId: 'prd-019', percentual: 0.24, diasAtras: 3 },
  { produtoId: 'prd-020', percentual: 0.2, diasAtras: 16 },
  { produtoId: 'prd-022', percentual: 0.24, diasAtras: 8 },
  { produtoId: 'prd-023', percentual: 0.26, diasAtras: 7 },
  { produtoId: 'prd-024', percentual: 0.24, diasAtras: 2 },
  { produtoId: 'prd-027', percentual: 0.28, diasAtras: 4 },
  { produtoId: 'prd-029', percentual: 0.4, diasAtras: 2 },
  { produtoId: 'prd-030', percentual: 0.5, diasAtras: 1 },
  { produtoId: 'prd-039', percentual: 0.3, diasAtras: 4 },
  { produtoId: 'prd-040', percentual: 0.3, diasAtras: 4 },
]

/**
 * Todo produto vendido precisa ter sido transferido antes. A lista acima cobre
 * 27 produtos; as vendas alcançam mais. Os que faltam entram aqui com uma
 * transferência dimensionada só pelo que saiu.
 */
const planoTransferencia = [
  ...transferencias,
  ...[...vendidoPorProduto.keys()]
    .filter((id) => !transferencias.some((t) => t.produtoId === id))
    .map((produtoId) => ({ produtoId, percentual: 0, diasAtras: 20 })),
]

planoTransferencia.forEach(({ produtoId, percentual, diasAtras }) => {
  const saldoCentral = saldos.find(
    (s) => s.produtoId === produtoId && s.localId === LOCAL_CENTRAL_ID,
  )
  if (!saldoCentral) return

  // O que fica na prateleira mais o que será vendido no período.
  const paraExpor = Math.max(2, Math.round(saldoCentral.quantidade * percentual))
  const qtd = Math.min(saldoCentral.quantidade, paraExpor + (vendidoPorProduto.get(produtoId) ?? 0))
  if (qtd <= 0) return

  saldoCentral.quantidade -= qtd
  saldoCentral.atualizadoEm = iso(-diasAtras, 8, 15)

  saldos.push({
    id: `sld-${saldoCentral.loteId}-loja`,
    produtoId,
    loteId: saldoCentral.loteId,
    localId: LOCAL_LOJA_ID,
    quantidade: qtd,
    reservado: 0,
    atualizadoEm: iso(-diasAtras, 8, 15),
  })

  movimentacoes.push({
    id: novoIdMov(),
    tipo: 'TRANSFERENCIA',
    produtoId,
    loteId: saldoCentral.loteId,
    quantidade: qtd,
    origemId: LOCAL_CENTRAL_ID,
    origemLabel: 'Estoque central',
    destinoId: LOCAL_LOJA_ID,
    destinoLabel: 'Mercadinho - Térreo',
    usuario: 'Maria Santos',
    observacao: 'Reabastecimento',
    documento: '',
    custoUnitario: custoDe(produtoId),
    valorTotal: Number((qtd * custoDe(produtoId)).toFixed(2)),
    data: iso(-diasAtras, 8, 15),
    status: 'concluida',
  })
})

/* ------------------------------- perdas ------------------------------ */

const rotulosMotivo: Record<PerdaEstoque['motivo'], string> = {
  vencimento: 'Vencimento',
  quebra: 'Quebra',
  avaria: 'Avaria',
  roubo: 'Roubo/Furto',
  'erro-operacional': 'Erro operacional',
  outros: 'Outros',
}

const perdaSeeds: Array<{
  produtoId: string
  motivo: PerdaEstoque['motivo']
  quantidade: number
  diasAtras: number
  usuario: string
}> = [
  { produtoId: 'prd-003', motivo: 'vencimento', quantidade: 6, diasAtras: 9, usuario: 'João Silva' },
  { produtoId: 'prd-002', motivo: 'quebra', quantidade: 2, diasAtras: 9, usuario: 'Maria Santos' },
  { produtoId: 'prd-018', motivo: 'avaria', quantidade: 4, diasAtras: 10, usuario: 'José Pereira' },
  { produtoId: 'prd-017', motivo: 'erro-operacional', quantidade: 3, diasAtras: 11, usuario: 'João Silva' },
  { produtoId: 'prd-016', motivo: 'outros', quantidade: 2, diasAtras: 12, usuario: 'Maria Santos' },
  { produtoId: 'prd-030', motivo: 'vencimento', quantidade: 3, diasAtras: 6, usuario: 'José Pereira' },
  { produtoId: 'prd-029', motivo: 'quebra', quantidade: 2, diasAtras: 4, usuario: 'Maria Santos' },
]

perdaSeeds.forEach((seed, i) => {
  const saldoLoja = saldos.find(
    (s) => s.produtoId === seed.produtoId && s.localId === LOCAL_LOJA_ID,
  )
  const alvo =
    saldoLoja && saldoLoja.quantidade >= seed.quantidade
      ? saldoLoja
      : saldos.find((s) => s.produtoId === seed.produtoId && s.localId === LOCAL_CENTRAL_ID)
  if (!alvo || alvo.quantidade < seed.quantidade) return

  alvo.quantidade -= seed.quantidade
  const custo = custoDe(seed.produtoId)
  const localNome = alvo.localId === LOCAL_LOJA_ID ? 'Mercadinho - Térreo' : 'Estoque central'
  const lote = lotes.find((l) => l.id === alvo.loteId)

  perdas.push({
    id: `per-${String(i + 1).padStart(3, '0')}`,
    produtoId: seed.produtoId,
    loteId: alvo.loteId,
    localId: alvo.localId,
    motivo: seed.motivo,
    quantidade: seed.quantidade,
    valor: Number((seed.quantidade * custo).toFixed(2)),
    observacao: '',
    registradoPor: seed.usuario,
    data: iso(-seed.diasAtras, 14, 32 - i * 3),
  })

  movimentacoes.push({
    id: novoIdMov(),
    tipo: 'PERDA',
    produtoId: seed.produtoId,
    loteId: alvo.loteId,
    quantidade: -seed.quantidade,
    origemId: alvo.localId,
    origemLabel: localNome,
    destinoId: null,
    destinoLabel: '-',
    usuario: seed.usuario,
    observacao: rotulosMotivo[seed.motivo],
    documento: lote?.codigo ?? '',
    custoUnitario: custo,
    valorTotal: Number((seed.quantidade * custo).toFixed(2)),
    data: iso(-seed.diasAtras, 14, 32 - i * 3),
    status: 'concluida',
  })
})

/* --------------------------- aplicação das vendas --------------------- */

/**
 * As vendas debitam a prateleira, em ordem cronológica e por FEFO.
 *
 * Venda cancelada não consome estoque — foi registrada e desfeita. As demais
 * geram movimentação `VENDA` com quantidade negativa, igual ao que a API grava
 * hoje quando o PDV registra uma venda.
 *
 * Se em algum momento faltar saldo, o item é registrado como não atendido em
 * vez de forçar estoque negativo. O contador aparece no log do seed: truncar em
 * silêncio faria os totais não fecharem sem ninguém perceber.
 */
export const vendasNaoAtendidas: string[] = []

const cronologicas = [...vendas].sort((a, b) => a.data.localeCompare(b.data))

for (const venda of cronologicas) {
  if (venda.status === 'cancelada') continue

  for (const item of venda.itens) {
    let restante = item.quantidade

    const disponiveis = saldos
      .filter((s) => s.produtoId === item.produtoId && s.localId === LOCAL_LOJA_ID && s.quantidade > 0)
      .sort((a, b) => {
        const la = lotes.find((l) => l.id === a.loteId)?.validade ?? '9999-12-31'
        const lb = lotes.find((l) => l.id === b.loteId)?.validade ?? '9999-12-31'
        return la.localeCompare(lb)
      })

    for (const saldo of disponiveis) {
      if (restante <= 0) break
      const usar = Math.min(saldo.quantidade, restante)
      saldo.quantidade -= usar
      saldo.atualizadoEm = venda.data
      restante -= usar

      const custo = lotes.find((l) => l.id === saldo.loteId)?.custoUnitario ?? 0
      movimentacoes.push({
        id: novoIdMov(),
        tipo: 'VENDA',
        produtoId: item.produtoId,
        loteId: saldo.loteId,
        quantidade: -usar,
        origemId: LOCAL_LOJA_ID,
        origemLabel: 'Mercadinho - Térreo',
        destinoId: null,
        destinoLabel: '-',
        usuario: venda.operador,
        observacao: `Venda ${venda.numero}`,
        documento: venda.numero,
        custoUnitario: custo,
        valorTotal: Number((usar * item.precoUnitario).toFixed(2)),
        data: venda.data,
        status: 'concluida',
      })
    }

    if (restante > 0) {
      vendasNaoAtendidas.push(`${venda.numero}/${item.produtoId} (faltaram ${restante})`)
    }
  }
}

const ajusteSeeds = [
  { produtoId: 'prd-006', delta: 2, diasAtras: 10, motivo: 'Ajuste de sistema' },
  { produtoId: 'prd-002', delta: -5, diasAtras: 8, motivo: 'Ajuste de contagem' },
  { produtoId: 'prd-021', delta: 3, diasAtras: 6, motivo: 'Ajuste de inventário' },
]

ajusteSeeds.forEach((seed) => {
  const saldo = saldos.find(
    (s) => s.produtoId === seed.produtoId && s.localId === LOCAL_CENTRAL_ID,
  )
  if (!saldo || saldo.quantidade + seed.delta < 0) return
  saldo.quantidade += seed.delta

  movimentacoes.push({
    id: novoIdMov(),
    tipo: 'AJUSTE',
    produtoId: seed.produtoId,
    loteId: saldo.loteId,
    quantidade: seed.delta,
    origemId: LOCAL_CENTRAL_ID,
    origemLabel: 'Estoque central',
    destinoId: null,
    destinoLabel: '-',
    usuario: 'José Pereira',
    observacao: seed.motivo,
    documento: '',
    custoUnitario: custoDe(seed.produtoId),
    valorTotal: null,
    data: iso(-seed.diasAtras, 7, 45),
    status: 'concluida',
  })
})

movimentacoes.sort((a, b) => b.data.localeCompare(a.data))

/* ------------------------------------------------------------------ */
/* Custo médio ponderado, derivado dos lotes                           */
/* ------------------------------------------------------------------ */

/**
 * No mock o custo médio era recalculado em runtime pelo DataStore. Aqui ele é
 * persistido, então precisa nascer com o valor certo: média ponderada pela
 * quantidade comprada de cada lote.
 */
const quantidadePorLote = new Map<string, number>()
for (const compra of compras) {
  for (const item of compra.itens) {
    const lote = lotes.find((l) => l.compraId === compra.id && l.produtoId === item.produtoId)
    if (lote) quantidadePorLote.set(lote.id, item.quantidade)
  }
}

for (const produto of produtos) {
  const seus = lotes.filter((l) => l.produtoId === produto.id)
  if (seus.length === 0) continue

  let quantidade = 0
  let valor = 0
  for (const lote of seus) {
    const q = quantidadePorLote.get(lote.id) ?? 0
    quantidade += q
    valor += q * lote.custoUnitario
  }
  produto.custoMedio = quantidade > 0 ? Number((valor / quantidade).toFixed(4)) : null
}

/** Última numeração usada, para as próximas compras continuarem a sequência. */
export const sequencias = [
  { chave: 'compra', valor: 1207 },
  { chave: 'venda', valor: 1000 + vendas.length },
]
