import type { ResumoInicio } from '@/models'
import { chamarApi } from './chamada'

export interface Dica {
  id: string
  texto: string
}

/**
 * Início é um guia de uso, não um painel analítico.
 *
 * As etapas refletem o estado real da conta: uma base vazia mostra tudo
 * pendente. Antes desta migração ele lia o `localStorage`, e por isso um
 * cliente novo via os números de outra empresa.
 */
export const InicioService = {
  async resumo(): Promise<ResumoInicio> {
    return chamarApi('/inicio/resumo')
  },

  async dicas(): Promise<Dica[]> {
    return chamarApi('/inicio/dicas')
  },
}
