import type {
  ConsultaBase,
  ID,
  LocalEstoque,
  LoteEstoqueItem,
  Paginado,
  SugestaoAbastecimento,
} from '@/models'
import { chamarApi, montarQuery } from './chamada'

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

  async sugestoes(): Promise<SugestaoAbastecimento[]> {
    return chamarApi('/abastecimento/sugestoes')
  },

  async resumoSugestoes(): Promise<ResumoSugestoes> {
    return chamarApi('/abastecimento/sugestoes/resumo')
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
