import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('mc-skeleton h-4 w-full', className)} aria-hidden />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('mc-card flex items-start gap-4 p-5', className)}>
      <Skeleton className="h-11 w-11 rounded-lg" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  )
}

export function SkeletonLinhas({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-2/3' : 'w-1/2')} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  icone: ReactNode
  titulo: string
  descricao?: string
  acao?: ReactNode
  className?: string
  compacto?: boolean
}

export function EmptyState({
  icone,
  titulo,
  descricao,
  acao,
  className,
  compacto,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compacto ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-2xl bg-surface-2 text-muted',
          compacto ? 'h-12 w-12' : 'h-16 w-16',
        )}
        aria-hidden
      >
        {icone}
      </span>
      <h3
        className={cn(
          'mt-4 font-display font-semibold text-ink',
          compacto ? 'text-body' : 'text-card-title',
        )}
      >
        {titulo}
      </h3>
      {descricao && (
        <p className={cn('mt-1.5 max-w-sm text-muted', compacto ? 'text-caption' : 'text-body')}>
          {descricao}
        </p>
      )}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Alert / Callout                                                     */
/* ------------------------------------------------------------------ */

export type TomAlerta = 'info' | 'success' | 'warning' | 'danger'

const alertaEstilos: Record<TomAlerta, string> = {
  info: 'bg-info-50 border-info-100 text-info',
  success: 'bg-success-50 border-success-100 text-success',
  warning: 'bg-warning-50 border-warning-100 text-[#B57407]',
  danger: 'bg-danger-50 border-danger-100 text-danger',
}

export function Alert({
  tom = 'info',
  icone,
  titulo,
  children,
  className,
  acao,
}: {
  tom?: TomAlerta
  icone?: ReactNode
  titulo?: ReactNode
  children?: ReactNode
  className?: string
  acao?: ReactNode
}) {
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', alertaEstilos[tom], className)}>
      {icone && <span className="mt-0.5 shrink-0">{icone}</span>}
      <div className="min-w-0 flex-1">
        {titulo && <p className="text-label font-semibold">{titulo}</p>}
        {children && <div className="mt-1 text-caption text-ink/70">{children}</div>}
      </div>
      {acao}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ProgressBar                                                         */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  valor,
  className,
  tom = 'teal',
  altura = 'md',
}: {
  valor: number
  className?: string
  tom?: 'teal' | 'amber' | 'success' | 'danger'
  altura?: 'sm' | 'md'
}) {
  const cores = {
    teal: 'bg-teal',
    amber: 'bg-amber',
    success: 'bg-success',
    danger: 'bg-danger',
  }
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-2',
        altura === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(valor)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', cores[tom])}
        style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
      />
    </div>
  )
}
