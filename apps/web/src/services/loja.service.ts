import type { ID, ItemLojaView } from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface ResumoLoja {
  itensExpostos: number
  valorPotencialVenda: number
  estoqueBaixoNaLoja: number
  reposicaoSugerida: number
  valorReposicao: number
  /**
   * Variações são **opcionais de propósito**: o card só desenha a linha quando
   * o campo existe. Devolver 0 afirmaria estabilidade onde não houve medição —
   * o mesmo defeito dos percentuais fixos que o mock inventava.
   */
  itensExpostosDelta?: number
  valorPotencialDelta?: number
  estoqueBaixoDelta?: number
}

export interface ConsultaLoja {
  busca?: string
  /** `nao-vendido` alcança os produtos que a loja desativou. */
  status?: ItemLojaView['status'] | 'todos' | 'nao-vendido'
}

/**
 * Produtos na loja.
 *
 * `retirarDaLoja` **escrevia no mock** até esta migração: consumia FEFO,
 * registrava movimentação e persistia no `localStorage`. A tela mostrava
 * sucesso e o banco nunca ficava sabendo — pior que dado velho, era uma
 * operação que desaparecia no próximo "Restaurar dados". Agora é uma
 * transação no Postgres como qualquer outra.
 */
export const LojaService = {
  async listar(consulta: ConsultaLoja = {}): Promise<ItemLojaView[]> {
    return chamarApi(`/loja${montarQuery({ ...consulta })}`)
  },

  async resumo(): Promise<ResumoLoja> {
    return chamarApi('/loja/resumo')
  },

  /** Retira o produto da loja, devolvendo-o ao estoque central (FEFO). */
  async retirarDaLoja(produtoId: ID, quantidade: number): Promise<void> {
    await chamarApi('/loja/retirar', {
      metodo: 'POST',
      corpo: { produtoId, quantidade },
    })
  },
}
