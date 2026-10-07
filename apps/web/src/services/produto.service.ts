import type {
  Categoria,
  ConsultaBase,
  ID,
  Marca,
  Paginado,
  Produto,
  ProdutoListItem,
  StatusProduto,
} from '@/models'
import { ErroDeNegocio } from './api'
import { ErroApi, requisitar } from './http'
import { AppSession } from './sessao'

/**
 * Catálogo de produtos — **primeiro módulo servido pela API real**.
 *
 * As assinaturas são exatamente as de antes: nenhuma das 8 páginas que
 * dependem deste service precisou mudar. Era a promessa da arquitetura, e é o
 * que permite migrar módulo a módulo sem quebrar a demonstração.
 */

export interface ConsultaProdutos extends ConsultaBase {
  categoriaId?: string
  status?: StatusProduto | 'todos'
  estoque?: 'todos' | 'baixo' | 'zerado' | 'ok'
  ordenar?: 'nome' | 'estoque' | 'preco' | 'recentes'
  /** Loja usada como contexto do preço exibido. */
  lojaId?: string
}

export interface ResumoProdutos {
  total: number
  ativos: number
  percentualAtivos: number
  estoqueBaixo: number
  percentualEstoqueBaixo: number
  semGiro: number
  percentualSemGiro: number
  deltaTotal: number
}

export interface EntradaConfiguracaoLoja {
  lojaId: ID
  precoVenda: number
  estoqueMinimo: number
  estoqueIdeal: number
  ativo: boolean
}

export interface ConfiguracaoLojaView extends EntradaConfiguracaoLoja {
  lojaNome: string
  /** Margem sobre o custo médio atual. `null` sem custo calculado. */
  margem: number | null
}

export interface EntradaProduto {
  nome: string
  ean: string
  sku: string
  categoriaId: string
  marcaId: string | null
  unidade: Produto['unidade']
  conteudo: string
  precoSugerido: number
  pontoCompra: number
  estoqueMaximoCentral: number
  controleValidade: Produto['controleValidade']
  validadePadraoDias: number | null
  localizacaoPadrao: string
  fornecedorPrincipalId: string | null
  observacoes: string
  imagem: string
  /** Preço e níveis por loja. Sem isto o produto não pode ser vendido. */
  configuracoesLoja: EntradaConfiguracaoLoja[]
}

/**
 * A API responde 409 para violação de regra de negócio e 400 para validação
 * de campo — os dois viram `ErroDeNegocio`, que é o que as telas já tratam.
 * Falha de rede e 500 continuam sendo erro técnico.
 */
async function chamar<T>(
  caminho: string,
  opcoes?: { metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT'; corpo?: unknown },
): Promise<T> {
  try {
    return await requisitar<T>(caminho, opcoes)
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 409 || erro.status === 400)) {
      throw new ErroDeNegocio(erro.message)
    }
    throw erro
  }
}

function consultaEmQuery(consulta: ConsultaProdutos): string {
  const params = new URLSearchParams()
  const adicionar = (chave: string, valor: string | number | undefined, ignorar?: string) => {
    if (valor === undefined || valor === '' || valor === ignorar) return
    params.set(chave, String(valor))
  }

  adicionar('busca', consulta.busca?.trim())
  adicionar('categoriaId', consulta.categoriaId, 'todas')
  adicionar('status', consulta.status, 'todos')
  adicionar('estoque', consulta.estoque, 'todos')
  adicionar('ordenar', consulta.ordenar)
  adicionar('lojaId', consulta.lojaId ?? AppSession.lojaAtualId())
  adicionar('pagina', consulta.pagina)
  adicionar('porPagina', consulta.porPagina)

  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export const ProdutoService = {
  async listar(consulta: ConsultaProdutos = {}): Promise<Paginado<ProdutoListItem>> {
    return chamar(`/produtos${consultaEmQuery(consulta)}`)
  },

  async resumo(): Promise<ResumoProdutos> {
    return chamar(`/produtos/resumo?lojaId=${encodeURIComponent(AppSession.lojaAtualId())}`)
  },

  async obter(id: ID, lojaId = AppSession.lojaAtualId()): Promise<ProdutoListItem> {
    return chamar(`/produtos/${id}${lojaId ? `?lojaId=${encodeURIComponent(lojaId)}` : ''}`)
  },

  async listarSimples(): Promise<ProdutoListItem[]> {
    return chamar('/produtos/simples')
  },

  async categorias(): Promise<Categoria[]> {
    return chamar('/categorias')
  },

  async marcas(): Promise<Marca[]> {
    return chamar('/marcas')
  },

  /** Sem `produtoId`, devolve o padrão de cada loja — usado no cadastro novo. */
  async configuracoesPorLoja(produtoId?: ID): Promise<ConfiguracaoLojaView[]> {
    return chamar(
      produtoId ? `/produtos/${produtoId}/configuracoes-loja` : '/produtos/configuracoes-loja',
    )
  },

  async criar(entrada: EntradaProduto): Promise<ProdutoListItem> {
    return chamar('/produtos', { metodo: 'POST', corpo: entrada })
  },

  async atualizar(id: ID, entrada: EntradaProduto): Promise<ProdutoListItem> {
    return chamar(`/produtos/${id}`, { metodo: 'PATCH', corpo: entrada })
  },

  async salvarConfiguracaoLoja(
    produtoId: ID,
    lojaId: ID,
    entrada: { precoVenda: number; estoqueMinimo: number; ativo: boolean },
  ): Promise<void> {
    await chamar(`/produtos/${produtoId}/configuracoes-loja/${lojaId}`, {
      metodo: 'PUT',
      corpo: entrada,
    })
  },

  async alternarStatus(id: ID): Promise<ProdutoListItem> {
    return chamar(`/produtos/${id}/status`, { metodo: 'PATCH' })
  },
}
