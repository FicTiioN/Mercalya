import type { EntradaLoja, ID, ItemLojaView, Loja } from '@/models'
import { chamarApi, montarQuery } from './chamada'
import { AppSession } from './sessao'

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
  /** Sem valor, a loja em contexto. */
  lojaId?: string
}

/**
 * A loja em operação e a gestão das lojas.
 *
 * Toda leitura e escrita operacional vai para a **loja em contexto**
 * (`AppSession.lojaAtualId()`), a menos que a tela peça outra. É isto que faz o
 * seletor de loja valer para todas as telas de uma vez, sem cada uma ter que
 * lembrar de passar o id.
 */
export const LojaService = {
  async listar(consulta: ConsultaLoja = {}): Promise<ItemLojaView[]> {
    return chamarApi(`/loja${montarQuery({ lojaId: AppSession.lojaAtualId(), ...consulta })}`)
  },

  async resumo(lojaId = AppSession.lojaAtualId()): Promise<ResumoLoja> {
    return chamarApi(`/loja/resumo${montarQuery({ lojaId })}`)
  },

  /** Retira o produto da loja, devolvendo-o ao estoque central (FEFO). */
  async retirarDaLoja(produtoId: ID, quantidade: number): Promise<void> {
    await chamarApi('/loja/retirar', {
      metodo: 'POST',
      corpo: { produtoId, quantidade, lojaId: AppSession.lojaAtualId() },
    })
  },

  /* ------------------------------ gestão ------------------------------ */

  /** Todas as lojas da empresa, inclusive inativas. */
  async todas(): Promise<Loja[]> {
    return chamarApi('/lojas')
  },

  async criar(entrada: EntradaLoja): Promise<Loja> {
    return chamarApi('/lojas', { metodo: 'POST', corpo: entrada })
  },

  async atualizar(id: ID, entrada: EntradaLoja): Promise<Loja> {
    return chamarApi(`/lojas/${id}`, { metodo: 'PATCH', corpo: entrada })
  },
}
