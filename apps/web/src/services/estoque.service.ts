import type {
  ConsultaBase,
  ID,
  LocalEstoque,
  LoteEstoqueItem,
  Paginado,
  SugestaoAbastecimento,
} from '@/models'
import { chamarApi, montarQuery } from './chamada'
import { AppSession } from './sessao'

export interface ConsultaEstoque extends ConsultaBase {
  categoriaId?: string
  status?: 'todos' | 'disponivel' | 'atencao' | 'critico'
  validade?: 'todos' | '7' | '15' | '30' | 'vencidos'
  localId?: string
  apenasComReserva?: boolean
}

export interface ResumoEstoque {
  totalItens: number
  totalItensDelta: number
  valorEstoque: number
  valorEstoqueDelta: number
  proximosVencer: number
  proximosVencerDelta: number
  reposicaoLoja: number
  reposicaoLojaDelta: number
}

export interface ResumoSugestoes {
  totalItens: number
  valorEstimado: number
  produtos: number
}

/** Estoque central: o que existe, onde está e por quanto tempo ainda vale. */
export const EstoqueService = {
  async locais(): Promise<LocalEstoque[]> {
    return chamarApi('/locais')
  },

  async listarLotes(consulta: ConsultaEstoque = {}): Promise<Paginado<LoteEstoqueItem>> {
    return chamarApi(
      `/estoque/lotes${montarQuery({
        ...consulta,
        apenasComReserva: consulta.apenasComReserva ? 'true' : undefined,
      })}`,
    )
  },

  async resumo(localId?: string): Promise<ResumoEstoque> {
    return chamarApi(`/estoque/resumo${montarQuery({ localId })}`)
  },

  /** Para a loja em contexto. */
  async sugestoes(): Promise<SugestaoAbastecimento[]> {
    return chamarApi(`/abastecimento/sugestoes${montarQuery({ lojaId: AppSession.lojaAtualId() })}`)
  },

  async resumoSugestoes(): Promise<ResumoSugestoes> {
    return chamarApi(
      `/abastecimento/sugestoes/resumo${montarQuery({ lojaId: AppSession.lojaAtualId() })}`,
    )
  },

  /** Corrige o saldo de um lote e deixa uma movimentação de AJUSTE. */
  async ajustar(params: {
    saldoId: ID
    novaQuantidade: number
    motivo: string
  }): Promise<{ delta: number }> {
    return chamarApi('/estoque/ajustar', { metodo: 'PATCH', corpo: params })
  },
}
