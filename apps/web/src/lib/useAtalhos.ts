import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/** Atalhos de navegação em sequência: `G` seguido de uma tecla. */
export const ATALHOS_NAVEGACAO: Array<{ tecla: string; rotulo: string; rota: string }> = [
  { tecla: 'I', rotulo: 'Ir para Início', rota: '/inicio' },
  { tecla: 'P', rotulo: 'Ir para Painel gerencial', rota: '/painel-gerencial' },
  { tecla: 'D', rotulo: 'Ir para Produtos', rota: '/cadastros/produtos' },
  { tecla: 'F', rotulo: 'Ir para Fornecedores', rota: '/cadastros/fornecedores' },
  { tecla: 'C', rotulo: 'Ir para Compras', rota: '/operacao/compras' },
  { tecla: 'E', rotulo: 'Ir para Estoque central', rota: '/operacao/estoque-central' },
  { tecla: 'A', rotulo: 'Ir para Abastecimento', rota: '/operacao/abastecimento' },
  { tecla: 'M', rotulo: 'Ir para Movimentações', rota: '/operacao/movimentacoes' },
]

function digitandoEmCampo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false
  const tag = alvo.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    alvo.isContentEditable
  )
}

/**
 * Registra os atalhos globais de navegação (`G` + tecla) e o atalho `?`
 * que abre a lista de atalhos. Ignora eventos disparados dentro de campos.
 */
export function useAtalhos(aoAbrirAtalhos: () => void): void {
  const navegar = useNavigate()
  const aguardandoG = useRef(false)
  const expiraEm = useRef(0)

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      if (digitandoEmCampo(evento.target)) return

      if (evento.key === '?') {
        evento.preventDefault()
        aoAbrirAtalhos()
        return
      }

      const tecla = evento.key.toUpperCase()

      if (aguardandoG.current && Date.now() < expiraEm.current) {
        aguardandoG.current = false
        const atalho = ATALHOS_NAVEGACAO.find((a) => a.tecla === tecla)
        if (atalho) {
          evento.preventDefault()
          navegar(atalho.rota)
        }
        return
      }

      if (tecla === 'G') {
        aguardandoG.current = true
        // A segunda tecla precisa vir logo em seguida.
        expiraEm.current = Date.now() + 1200
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [navegar, aoAbrirAtalhos])
}
