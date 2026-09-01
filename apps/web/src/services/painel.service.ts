import type { DashboardGerencial } from '@/models'
import { chamarApi, montarQuery } from './chamada'

export interface FiltroPainel {
  lojaId?: string
  de?: string
  ate?: string
  granularidade?: 'diario' | 'semanal' | 'mensal'
}

/**
 * Painel gerencial.
 *
 * Era uma maquete: a evolução de vendas era uma onda senoidal, os deltas eram
 * constantes e o faturamento era uma projeção. Agora todo número vem somado do
 * banco — e o que não dá para medir simplesmente não vem.
 */
export const PainelService = {
  async carregar(filtro: FiltroPainel = {}): Promise<DashboardGerencial> {
    return chamarApi(`/painel${montarQuery({ ...filtro })}`)
  },

  async lojas(): Promise<Array<{ id: string; nome: string }>> {
    return chamarApi('/painel/lojas')
  },
}
