import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Drawer lateral. Nas referências (Fornecedores e Movimentações) ele é uma
 * coluna fixa à direita do conteúdo em telas grandes, e vira overlay abaixo
 * de `xl`. Um único componente atende os dois casos.
 */
export interface DrawerProps {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  /** Elemento ao lado do título (badge de status, id...). */
  acessorioTitulo?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  className?: string
}

export function Drawer({
  aberto,
  aoFechar,
  titulo,
  acessorioTitulo,
  children,
  rodape,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <>
      {/* Overlay apenas abaixo de xl — em telas grandes o drawer é coluna. */}
      <div
        className="fixed inset-0 z-40 bg-ink/20 animate-fade-in xl:hidden"
        onClick={aoFechar}
        aria-hidden
      />

      <aside
        className={cn(
          'z-50 flex flex-col bg-surface animate-slide-in-right',
          'fixed inset-y-0 right-0 w-[min(400px,92vw)] border-l border-line shadow-overlay',
          'xl:static xl:z-auto xl:w-drawer xl:shrink-0 xl:animate-none xl:rounded-xl xl:border xl:shadow-card',
          className,
        )}
        role="dialog"
        aria-label={typeof titulo === 'string' ? titulo : 'Detalhes'}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 xl:border-b-0 xl:pb-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <h2 className="truncate font-display text-card-title font-semibold text-ink">
              {titulo}
            </h2>
            {acessorioTitulo}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar painel"
            className="-mr-1 shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4.5 w-4.5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-5 xl:pt-1">{children}</div>

        {rodape && <div className="border-t border-line p-4">{rodape}</div>}
      </aside>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Blocos internos padronizados do drawer                              */
/* ------------------------------------------------------------------ */

export function DrawerSection({
  titulo,
  children,
  className,
}: {
  titulo?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('border-t border-line py-4 first:border-t-0 first:pt-2', className)}>
      {titulo && <h3 className="mb-3 text-label font-semibold text-ink">{titulo}</h3>}
      {children}
    </section>
  )
}

export function DrawerLinha({
  icone,
  rotulo,
  valor,
}: {
  icone?: ReactNode
  rotulo: string
  valor: ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {icone && <span className="mt-0.5 shrink-0 text-muted">{icone}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-caption text-muted">{rotulo}</p>
        <p className="mt-0.5 break-words text-body text-ink">{valor}</p>
      </div>
    </div>
  )
}

export function DrawerEstatistica({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="text-caption text-muted">{rotulo}</span>
      <span className="text-label font-medium tabular text-ink">{valor}</span>
    </div>
  )
}

/** Botão de ação rápida usado no rodapé dos drawers e nas laterais. */
export function QuickAction({
  icone,
  children,
  descricao,
  onClick,
  destrutivo,
  className,
}: {
  icone: ReactNode
  children: ReactNode
  descricao?: string
  onClick?: () => void
  destrutivo?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-3 text-left transition-colors',
        destrutivo
          ? 'text-danger hover:border-danger/40 hover:bg-danger-50'
          : 'text-ink hover:border-teal-100 hover:bg-teal-50',
        className,
      )}
    >
      <span className={cn('shrink-0', destrutivo ? 'text-danger' : 'text-teal')}>{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium">{children}</span>
        {descricao && <span className="mt-0.5 block text-caption text-muted">{descricao}</span>}
      </span>
    </button>
  )
}
