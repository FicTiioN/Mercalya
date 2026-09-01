import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export interface DialogProps {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: ReactNode
  children?: ReactNode
  rodape?: ReactNode
  larguraMaxima?: string
}

export function Dialog({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  larguraMaxima = 'max-w-lg',
}: DialogProps) {
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={aoFechar} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay animate-slide-up',
          larguraMaxima,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0">
            <h2 className="font-display text-section-title font-semibold text-ink">{titulo}</h2>
            {descricao && <p className="mt-1.5 text-body text-muted">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-2 -mt-1 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4.5 w-4.5" strokeWidth={1.75} />
          </button>
        </header>

        {children && <div className="px-6 py-4">{children}</div>}

        {rodape && (
          <footer className="flex items-center justify-end gap-3 border-t border-line bg-bg/40 px-6 py-4">
            {rodape}
          </footer>
        )}
      </div>
    </div>
  )
}

export interface ConfirmDialogProps {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  descricao: ReactNode
  rotuloConfirmar?: string
  rotuloCancelar?: string
  destrutivo?: boolean
  carregando?: boolean
}

export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  destrutivo,
  carregando,
}: ConfirmDialogProps) {
  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      larguraMaxima="max-w-md"
      rodape={
        <>
          <Button variante="ghost" onClick={aoFechar} disabled={carregando}>
            {rotuloCancelar}
          </Button>
          <Button
            variante={destrutivo ? 'danger' : 'primary'}
            onClick={aoConfirmar}
            carregando={carregando}
          >
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        {destrutivo && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger"
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
          </span>
        )}
        <div className="pt-0.5 text-body text-muted">{descricao}</div>
      </div>
    </Dialog>
  )
}
