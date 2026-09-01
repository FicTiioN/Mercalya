import { useCallback, useEffect, useRef, useState } from 'react'

export interface EstadoRecurso<T> {
  dados: T | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

/**
 * Executa um Service e expõe loading/erro/dados.
 * Toda página consome dados por aqui — nunca importando mocks diretamente.
 */
export function useRecurso<T>(
  carregar: () => Promise<T>,
  dependencias: unknown[] = [],
): EstadoRecurso<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const montado = useRef(true)
  const carregarRef = useRef(carregar)
  carregarRef.current = carregar

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro(null)

    carregarRef
      .current()
      .then((resultado) => {
        if (cancelado || !montado.current) return
        setDados(resultado)
      })
      .catch((e: unknown) => {
        if (cancelado || !montado.current) return
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.')
      })
      .finally(() => {
        if (cancelado || !montado.current) return
        setCarregando(false)
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao, ...dependencias])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return { dados, carregando, erro, recarregar }
}

/** Debounce simples para campos de busca. */
export function useDebounce<T>(valor: T, atraso = 300): T {
  const [debounced, setDebounced] = useState(valor)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(valor), atraso)
    return () => window.clearTimeout(id)
  }, [valor, atraso])

  return debounced
}
