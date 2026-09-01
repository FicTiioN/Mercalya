import { createContext, useContext } from 'react'

export type TomToast = 'success' | 'warning' | 'error' | 'info'

export interface ToastContextValue {
  sucesso: (titulo: string, descricao?: string) => void
  erro: (titulo: string, descricao?: string) => void
  aviso: (titulo: string, descricao?: string) => void
  info: (titulo: string, descricao?: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return ctx
}
