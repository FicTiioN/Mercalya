import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ToastContext, type TomToast, type ToastContextValue } from './toast-context'

interface Toast {
  id: number
  tom: TomToast
  titulo: string
  descricao?: string
}

const config: Record<TomToast, { icone: ReactNode; classe: string }> = {
  success: {
    icone: <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />,
    classe: 'border-success-100 bg-success-50 text-success',
  },
  warning: {
    icone: <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />,
    classe: 'border-warning-100 bg-warning-50 text-[#B57407]',
  },
  error: {
    icone: <XCircle className="h-5 w-5" strokeWidth={1.75} />,
    classe: 'border-danger-100 bg-danger-50 text-danger',
  },
  info: {
    icone: <Info className="h-5 w-5" strokeWidth={1.75} />,
    classe: 'border-info-100 bg-info-50 text-info',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(1)

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id))
  }, [])

  const adicionar = useCallback(
    (tom: TomToast, titulo: string, descricao?: string) => {
      const id = proximoId.current
      proximoId.current += 1
      setToasts((atuais) => [...atuais, { id, tom, titulo, descricao }].slice(-4))
      window.setTimeout(() => remover(id), tom === 'error' ? 6000 : 4200)
    },
    [remover],
  )

  const valor = useMemo<ToastContextValue>(
    () => ({
      sucesso: (t, d) => adicionar('success', t, d),
      erro: (t, d) => adicionar('error', t, d),
      aviso: (t, d) => adicionar('warning', t, d),
      info: (t, d) => adicionar('info', t, d),
    }),
    [adicionar],
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}

      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[70] flex w-[min(380px,calc(100vw-48px))] flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-pop animate-slide-up',
              config[toast.tom].classe,
            )}
          >
            <span className="mt-0.5 shrink-0">{config[toast.tom].icone}</span>
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold text-ink">{toast.titulo}</p>
              {toast.descricao && (
                <p className="mt-0.5 text-caption text-muted">{toast.descricao}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remover(toast.id)}
              aria-label="Fechar notificação"
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
