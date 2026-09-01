import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Migalha {
  label: string
  to?: string
}

export interface PageHeaderProps {
  titulo: string
  descricao?: string
  migalhas?: Migalha[]
  acoes?: ReactNode
  /** Bloco alinhado à direita usado para filtros (Painel gerencial, Perdas). */
  filtros?: ReactNode
  className?: string
}

export function PageHeader({
  titulo,
  descricao,
  migalhas,
  acoes,
  filtros,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-6', className)}>
      <div className="min-w-0 flex-1">
        {migalhas && migalhas.length > 0 && (
          <nav className="mb-2 flex items-center gap-1.5 text-caption text-muted">
            {migalhas.map((m, i) => (
              <span key={`${m.label}-${i}`} className="flex items-center gap-1.5">
                {m.to ? (
                  <Link to={m.to} className="transition-colors hover:text-teal">
                    {m.label}
                  </Link>
                ) : (
                  <span className="text-ink">{m.label}</span>
                )}
                {i < migalhas.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted/60" aria-hidden />
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className="font-display text-page-title font-bold tracking-[-0.02em] text-ink">
          {titulo}
        </h1>
        {descricao && <p className="mt-2 max-w-2xl text-body text-muted">{descricao}</p>}
      </div>

      {(acoes || filtros) && (
        <div className="flex shrink-0 items-start gap-3">
          {filtros}
          {acoes}
        </div>
      )}
    </header>
  )
}
