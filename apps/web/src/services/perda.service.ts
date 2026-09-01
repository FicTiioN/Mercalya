import type { ConsultaBase, ID, MotivoPerda, Paginado, PerdaEstoque } from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface ConsultaPerdas extends ConsultaBase {
  motivo?: MotivoPerda | 'todos'
  localId?: string
}

export interface PerdaListItem extends PerdaEstoque {
  produtoNome: string
  produtoImagem: string
  motivoLabel: string
  localNome: string
  loteCodigo: string | null
}

export interface ResumoPerdas {
  perdasMes: number
  perdasMesDelta: number
  valorPerdido: number
  valorPerdidoDelta: number
  itensVencidos: number
  itensVencidosDelta: number
  ajustesPendentes: number
}

export interface ProximoVencimento {
  /** Identificador do saldo — o mesmo lote pode existir em mais de um local. */
  saldoId: ID
  produtoId: ID
  nome: string
  imagem: string
  loteCodigo: string
  validade: string
  dias: number
  quantidade: number
}

export interface TopPerda {
  produtoId: ID
  nome: string
  valor: number
}

export interface EntradaPerda {
  produtoId: ID
  motivo: MotivoPerda
  quantidade: number
  localId: ID
  loteId: ID | null
  data: string
  observacao: string
}

export const MOTIVOS: Array<{ valor: MotivoPerda; label: string; tom: string }> = [
  { valor: 'vencimento', label: 'Vencimento', tom: 'danger' },
  { valor: 'quebra', label: 'Quebra', tom: 'warning' },
  { valor: 'avaria', label: 'Avaria', tom: 'warning' },
  { valor: 'roubo', label: 'Roubo/Furto', tom: 'danger' },
  { valor: 'erro-operacional', label: 'Erro operacional', tom: 'info' },
  { valor: 'outros', label: 'Outros', tom: 'neutral' },
]

/** Perda reduz o estoque e não volta — por isso o registro é definitivo. */
export const PerdaService = {
  async listar(consulta: ConsultaPerdas = {}): Promise<Paginado<PerdaListItem>> {
    return chamarApi(`/perdas${montarQuery({ ...consulta })}`)
  },

  async resumo(): Promise<ResumoPerdas> {
    return chamarApi('/perdas/resumo')
  },

  async proximosVencimentos(limite = 5): Promise<ProximoVencimento[]> {
    return chamarApi(`/perdas/vencimentos${montarQuery({ limite })}`)
  },

  async topPerdas(limite = 5): Promise<TopPerda[]> {
    return chamarApi(`/perdas/top${montarQuery({ limite })}`)
  },

  async registrar(entrada: EntradaPerda): Promise<PerdaListItem> {
    return chamarApi('/perdas', { metodo: 'POST', corpo: entrada })
  },
}
