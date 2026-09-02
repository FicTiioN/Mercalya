import { useSyncExternalStore } from 'react'
import { AppSession } from '@/services/sessao'

/**
 * Id da loja em contexto, reativo: o componente re-renderiza quando o usuário
 * troca de loja no menu ou quando a lista de lojas muda.
 */
export function useLojaAtual(): string {
  return useSyncExternalStore(AppSession.assinar, AppSession.lojaAtualId, AppSession.lojaAtualId)
}
