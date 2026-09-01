import type { Abastecimento, ID } from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface ProdutoDisponivel {
  produtoId: ID
  nome: string
  imagem: string
  categoriaNome: string
  disponivelCentral: number
  naLoja: number
  minimoLoja: number
  idealLoja: number
}

export interface ItemAbastecimentoEntrada {
  produtoId: ID
  quantidade: number
}

export interface AbastecimentoListItem extends Abastecimento {
  destinoNome: string
}

export interface ResultadoAbastecimento {
  abastecimento: AbastecimentoListItem
  /** Confirmação de que a transferência não alterou o total global. */
  totalGlobalAntes: number
  totalGlobalDepois: number
}

/**
 * Abastecimento é **transferência**: o central diminui exatamente o que a loja
 * aumenta. Os totais global antes/depois vêm da API para tornar isso
 * verificável na própria tela.
 */
export const AbastecimentoService = {
  async origemDestino(): Promise<{
    origemNome: string
    itensDisponiveis: number
    destinoNome: string
    itensNaLoja: number
  }> {
    return chamarApi('/abastecimento/origem-destino')
  },

  async produtosDisponiveis(busca = ''): Promise<ProdutoDisponivel[]> {
    return chamarApi(`/abastecimento/disponiveis${montarQuery({ busca })}`)
  },

  async recentes(limite = 5): Promise<AbastecimentoListItem[]> {
    return chamarApi(`/abastecimento/recentes${montarQuery({ limite })}`)
  },

  async confirmar(itens: ItemAbastecimentoEntrada[]): Promise<ResultadoAbastecimento> {
    return chamarApi('/abastecimento/confirmar', { metodo: 'POST', corpo: { itens } })
  },
}
