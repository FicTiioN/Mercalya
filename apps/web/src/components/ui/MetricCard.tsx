import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TomMetrica = 'teal' | 'success' | 'amber' | 'info' | 'danger' | 'purple' | 'neutro'

const fundos: Record<TomMetrica, string> = {
  teal: 'bg-teal-50 text-teal',
  success: 'bg-success-50 text-success',
  amber: 'bg-amber-50 text-[#D68A0F]',
  info: 'bg-info-50 text-info',
  danger: 'bg-danger-50 text-danger',
  purple: 'bg-[#F1EDFC] text-[#6D4FD0]',
  neutro: 'bg-surface-2 text-muted',
}

export interface MetricCardProps {
  rotulo: string
  valor: ReactNode
  icone: ReactNode
  tom?: TomMetrica
  /** Variação percentual. Positiva sobe verde, negativa desce vermelho. */
  delta?: number
  /** Texto após a variação, ex.: "vs mês anterior". */
  deltaSufixo?: string
  /** Linha auxiliar quando não há variação — ex.: "82,3% do total". */
  auxiliar?: ReactNode
  /** Inverte a semântica de cor (queda de perdas é positiva). */
  deltaInvertido?: boolean
  className?: string
  onClick?: () => void
}

export function MetricCard({
  rotulo,
  valor,
  icone,
  tom = 'teal',
  delta,
  deltaSufixo = 'vs mês anterior',
  auxiliar,
  deltaInvertido = false,
  className,
  onClick,
}: MetricCardProps) {
  const positivo = delta !== undefined && (deltaInvertido ? delta < 0 : delta > 0)
  const negativo = delta !== undefined && (deltaInvertido ? delta > 0 : delta < 0)

  const Elemento = onClick ? 'button' : 'div'

  return (
    <Elemento
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'mc-card flex items-start gap-2.5 p-4 text-left',
        onClick && 'transition-colors hover:border-teal-100 hover:bg-teal-50/30',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          fundos[tom],
        )}
        aria-hidden
      >
        {icone}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] leading-4 text-muted">{rotulo}</p>
        <p className="mt-1 truncate font-display text-[19px] font-semibold leading-7 tabular text-ink">
          {valor}
        </p>

        {delta !== undefined ? (
          <p className="mt-1 flex items-center gap-1 truncate text-[10.5px]">
            <span
              className={cn(
                'shrink-0 font-medium',
                positivo && 'text-success',
                negativo && 'text-danger',
                !positivo && !negativo && 'text-muted',
              )}
            >
              {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'}{' '}
              {Math.abs(delta).toFixed(1).replace('.', ',')}%
            </span>
            <span className="truncate text-muted">{deltaSufixo}</span>
          </p>
        ) : (
          auxiliar && <p className="mt-1 truncate text-[10.5px] text-muted">{auxiliar}</p>
        )}
      </div>
    </Elemento>
  )
}

/** Grade padrão de 4 métricas usada em quase todas as listagens. */
export function MetricGrid({
  children,
  colunas = 4,
}: {
  children: ReactNode
  colunas?: 3 | 4 | 5
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        colunas === 5 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        colunas === 4 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
        colunas === 3 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
      )}
    >
      {children}
    </div>
  )
}
