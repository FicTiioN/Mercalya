import type { Notificacao } from '@/models'
import { chamarApi } from './chamada'

export interface ResumoNotificacoes {
  itens: Notificacao[]
  naoLidas: number
}

/**
 * Notificações não são armazenadas: cada uma é derivada de um fato operacional
 * real (ruptura, vencimento, compra confirmada, perda). O id é determinístico,
 * e é isso que permite a marca de "lida" persistir sem guardar a notificação.
 *
 * A marca agora é **por usuário** no banco — antes ficava no `localStorage`, o
 * que significava que ela pertencia ao navegador, não à pessoa.
 */
export const NotificacaoService = {
  async listar(): Promise<ResumoNotificacoes> {
    return chamarApi('/notificacoes')
  },

  async marcarComoLida(id: string): Promise<void> {
    await chamarApi('/notificacoes/lidas', { metodo: 'POST', corpo: { chave: id } })
  },

  async marcarTodasComoLidas(): Promise<void> {
    await chamarApi('/notificacoes/lidas/todas', { metodo: 'POST' })
  },
}
