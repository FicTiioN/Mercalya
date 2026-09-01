import type { ConsultaBase, ID, MovimentacaoEstoque, Paginado, TipoMovimentacao } from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface ConsultaMovimentacoes extends ConsultaBase {
  tipo?: TipoMovimentacao | 'todos'
  produtoId?: string
  usuario?: string
  origemId?: string
  destinoId?: string
  de?: string
  ate?: string
}

export interface MovimentacaoListItem extends MovimentacaoEstoque {
  produtoNome: string
  produtoImagem: string
  produtoSku: string
  marcaNome: string | null
  loteCodigo: string | null
  loteValidade: string | null
}

export interface ResumoMovimentacoes {
  entradasDia: number
  entradasItens: number
  entradasDelta: number
  transferencias: number
  transferenciasItens: number
  transferenciasDelta: number
  ajustes: number
  ajustesItens: number
  ajustesDelta: number
  perdas: number
  perdasItens: number
  perdasDelta: number
}

export interface EventoHistorico {
  titulo: string
  descricao: string
  autor: string
  quando: string
}

/** Histórico imutável do estoque. Só leitura — quem escreve são as operações. */
export const MovimentacaoService = {
  async listar(consulta: ConsultaMovimentacoes = {}): Promise<Paginado<MovimentacaoListItem>> {
    return chamarApi(`/movimentacoes${montarQuery({ ...consulta })}`)
  },

  async resumo(): Promise<ResumoMovimentacoes> {
    return chamarApi('/movimentacoes/resumo')
  },

  /** Usuários que já movimentaram estoque — opções do filtro. */
  async usuarios(): Promise<string[]> {
    return chamarApi('/movimentacoes/usuarios')
  },

  async historico(id: ID): Promise<EventoHistorico[]> {
    return chamarApi(`/movimentacoes/${id}/historico`)
  },
}
