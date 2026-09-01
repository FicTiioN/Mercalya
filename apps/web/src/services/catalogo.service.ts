import type { Categoria, ID, Marca } from '@/models'
import { chamarApi } from './chamada'

export interface CategoriaComUso extends Categoria {
  totalProdutos: number
  totalFornecedores: number
}

export interface MarcaComUso extends Marca {
  totalProdutos: number
}

export interface EntradaCategoria {
  nome: string
  cor?: string
  emoji?: string
}

/**
 * Categorias e marcas.
 *
 * Eram somente leitura, e isso deixava uma conta nova travada: categoria é
 * obrigatória no produto e não havia como criar a primeira. A criação acontece
 * de dentro do formulário de produto; a gestão fica em Configurações.
 */
export const CatalogoService = {
  async categorias(): Promise<Categoria[]> {
    return chamarApi('/categorias')
  },

  async marcas(): Promise<Marca[]> {
    return chamarApi('/marcas')
  },

  /** Com a contagem de uso — o que impede a exclusão. */
  async categoriasComUso(): Promise<CategoriaComUso[]> {
    return chamarApi('/categorias/uso')
  },

  async marcasComUso(): Promise<MarcaComUso[]> {
    return chamarApi('/marcas/uso')
  },

  async criarCategoria(entrada: EntradaCategoria): Promise<Categoria> {
    return chamarApi('/categorias', { metodo: 'POST', corpo: entrada })
  },

  async atualizarCategoria(id: ID, entrada: EntradaCategoria): Promise<Categoria> {
    return chamarApi(`/categorias/${id}`, { metodo: 'PATCH', corpo: entrada })
  },

  async removerCategoria(id: ID): Promise<void> {
    await chamarApi(`/categorias/${id}`, { metodo: 'DELETE' })
  },

  async criarMarca(nome: string): Promise<Marca> {
    return chamarApi('/marcas', { metodo: 'POST', corpo: { nome } })
  },

  async atualizarMarca(id: ID, nome: string): Promise<Marca> {
    return chamarApi(`/marcas/${id}`, { metodo: 'PATCH', corpo: { nome } })
  },

  async removerMarca(id: ID): Promise<void> {
    await chamarApi(`/marcas/${id}`, { metodo: 'DELETE' })
  },
}
