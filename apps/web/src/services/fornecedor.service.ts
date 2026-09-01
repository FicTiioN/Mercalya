import type {
  ConsultaBase,
  Fornecedor,
  FornecedorListItem,
  ID,
  Paginado,
  StatusFornecedor,
} from '@/models'
import { ErroDeNegocio } from './api'
import { ErroApi, requisitar } from './http'

/**
 * Fornecedores — segundo módulo servido pela API real.
 *
 * Mesmas assinaturas de antes: as 4 páginas que dependem deste service
 * (Fornecedores, Formulário, Nova compra e Detalhe da compra) não mudaram.
 */

export interface ConsultaFornecedores extends ConsultaBase {
  status?: StatusFornecedor | 'todos'
  categoriaId?: string
}

export interface ResumoFornecedores {
  total: number
  ativos: number
  percentualAtivos: number
  novosNoMes: number
  comprasSemana: number
  comprasSemanaDelta: number
  semMovimentacao: number
}

export interface EntradaFornecedor {
  nome: string
  nomeFantasia: string
  documento: string
  categoriaPrincipalId: string
  contato: Fornecedor['contato']
  endereco: Fornecedor['endereco']
  comercial: Fornecedor['comercial']
  observacoes: string
  status: StatusFornecedor
}

export interface ProdutoFornecido {
  produtoId: ID
  nome: string
  imagem: string
  categoriaNome: string
  quantidade: number
}

export interface CompraResumida {
  compraId: ID
  numero: string
  data: string
  total: number
  status: 'entregue' | 'em-andamento'
}

/** 409/400 viram `ErroDeNegocio`, que é o que as telas já tratam. */
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

function consultaEmQuery(consulta: ConsultaFornecedores): string {
  const params = new URLSearchParams()
  const adicionar = (chave: string, valor: string | number | undefined, ignorar?: string) => {
    if (valor === undefined || valor === '' || valor === ignorar) return
    params.set(chave, String(valor))
  }

  adicionar('busca', consulta.busca?.trim())
  adicionar('status', consulta.status, 'todos')
  adicionar('categoriaId', consulta.categoriaId, 'todas')
  adicionar('pagina', consulta.pagina)
  adicionar('porPagina', consulta.porPagina)

  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export const FornecedorService = {
  async listar(consulta: ConsultaFornecedores = {}): Promise<Paginado<FornecedorListItem>> {
    return chamar(`/fornecedores${consultaEmQuery(consulta)}`)
  },

  async resumo(): Promise<ResumoFornecedores> {
    return chamar('/fornecedores/resumo')
  },

  async obter(id: ID): Promise<FornecedorListItem> {
    return chamar(`/fornecedores/${id}`)
  },

  async listarSimples(): Promise<Fornecedor[]> {
    return chamar('/fornecedores/simples')
  },

  /** Produtos fornecidos — vazio para fornecedor recém-criado (empty state). */
  async produtosFornecidos(id: ID): Promise<ProdutoFornecido[]> {
    return chamar(`/fornecedores/${id}/produtos`)
  },

  /** Últimas compras — vazio para fornecedor recém-criado (empty state). */
  async ultimasCompras(id: ID): Promise<CompraResumida[]> {
    return chamar(`/fornecedores/${id}/compras`)
  },

  async criar(entrada: EntradaFornecedor): Promise<FornecedorListItem> {
    return chamar('/fornecedores', { metodo: 'POST', corpo: entrada })
  },

  async atualizar(id: ID, entrada: Partial<EntradaFornecedor>): Promise<FornecedorListItem> {
    return chamar(`/fornecedores/${id}`, { metodo: 'PATCH', corpo: entrada })
  },

  async alternarStatus(id: ID): Promise<FornecedorListItem> {
    return chamar(`/fornecedores/${id}/status`, { metodo: 'PATCH' })
  },
}
