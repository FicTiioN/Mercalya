import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/* ProductAvatar — miniatura de produto usada em tabelas e listas      */
/* ------------------------------------------------------------------ */

export function ProductAvatar({
  imagem,
  nome,
  tamanho = 'md',
  className,
}: {
  imagem: string
  nome?: string
  tamanho?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const tamanhos = {
    sm: 'h-8 w-8 text-[15px] rounded-md',
    md: 'h-10 w-10 text-[19px] rounded-lg',
    lg: 'h-14 w-14 text-[26px] rounded-xl',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-line bg-surface-2 leading-none',
        tamanhos[tamanho],
        className,
      )}
      role="img"
      aria-label={nome ? `Imagem de ${nome}` : undefined}
      title={nome}
    >
      {imagem}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar de pessoa                                                    */
/* ------------------------------------------------------------------ */

export function Avatar({
  iniciais,
  tamanho = 'md',
  className,
}: {
  iniciais: string
  tamanho?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const tamanhos = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-label',
    lg: 'h-11 w-11 text-body',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-teal font-semibold text-white',
        tamanhos[tamanho],
        className,
      )}
      aria-hidden
    >
      {iniciais}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Stepper — usado em Nova compra                                      */
/* ------------------------------------------------------------------ */

export interface EtapaStepper {
  numero: number
  titulo: string
  descricao: string
}

export function Stepper({
  etapas,
  atual,
  aoSelecionar,
}: {
  etapas: EtapaStepper[]
  atual: number
  aoSelecionar?: (numero: number) => void
}) {
  return (
    <ol className="flex items-start">
      {etapas.map((etapa, i) => {
        const concluida = etapa.numero < atual
        const ativa = etapa.numero === atual
        const clicavel = aoSelecionar && etapa.numero <= atual

        return (
          <li key={etapa.numero} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center px-2 text-center">
              <button
                type="button"
                disabled={!clicavel}
                onClick={clicavel ? () => aoSelecionar(etapa.numero) : undefined}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-label font-semibold transition-colors',
                  ativa && 'border-teal bg-teal text-white',
                  concluida && 'border-teal bg-teal text-white',
                  !ativa && !concluida && 'border-line bg-surface text-muted',
                  clicavel && 'cursor-pointer',
                )}
              >
                {etapa.numero}
              </button>
              <p
                className={cn(
                  'mt-2.5 text-label font-semibold',
                  ativa || concluida ? 'text-ink' : 'text-muted',
                )}
              >
                {etapa.titulo}
              </p>
              <p className="mt-1 max-w-[150px] text-caption leading-snug text-muted">
                {etapa.descricao}
              </p>
            </div>

            {i < etapas.length - 1 && (
              <div className="mt-5 h-0.5 flex-1 rounded-full bg-line">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    concluida ? 'w-full bg-teal' : 'w-0',
                  )}
                />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Segmento (chips de seleção rápida — motivos de perda)               */
/* ------------------------------------------------------------------ */

export function Chip({
  ativo,
  onClick,
  children,
  tom = 'neutro',
}: {
  ativo?: boolean
  onClick?: () => void
  children: ReactNode
  tom?: 'danger' | 'warning' | 'amber' | 'purple' | 'info' | 'neutro'
}) {
  const tons = {
    danger: 'border-danger/40 text-danger hover:bg-danger-50',
    warning: 'border-warning/40 text-[#B57407] hover:bg-warning-50',
    amber: 'border-amber/40 text-[#B57407] hover:bg-amber-50',
    purple: 'border-[#C9B9F2] text-[#6D4FD0] hover:bg-[#F1EDFC]',
    info: 'border-info/40 text-info hover:bg-info-50',
    neutro: 'border-line text-muted hover:bg-surface-2',
  }
  const ativos = {
    danger: 'border-danger bg-danger-50 text-danger',
    warning: 'border-warning bg-warning-50 text-[#B57407]',
    amber: 'border-amber bg-amber-50 text-[#B57407]',
    purple: 'border-[#6D4FD0] bg-[#F1EDFC] text-[#6D4FD0]',
    info: 'border-info bg-info-50 text-info',
    neutro: 'border-ink/30 bg-surface-2 text-ink',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors',
        ativo ? ativos[tom] : tons[tom],
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Contador +/- usado no carrinho de abastecimento                     */
/* ------------------------------------------------------------------ */

export function Contador({
  valor,
  aoMudar,
  minimo = 1,
  maximo,
}: {
  valor: number
  aoMudar: (valor: number) => void
  minimo?: number
  maximo?: number
}) {
  const botao =
    'flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        className={botao}
        onClick={() => aoMudar(Math.max(minimo, valor - 1))}
        disabled={valor <= minimo}
        aria-label="Diminuir"
      >
        −
      </button>
      <input
        type="number"
        value={valor}
        min={minimo}
        max={maximo}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          aoMudar(Math.max(minimo, maximo ? Math.min(maximo, n) : n))
        }}
        className="h-8 w-14 rounded-md border border-line bg-surface text-center text-label tabular text-ink mc-focus [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantidade"
      />
      <button
        type="button"
        className={botao}
        onClick={() => aoMudar(maximo ? Math.min(maximo, valor + 1) : valor + 1)}
        disabled={maximo !== undefined && valor >= maximo}
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}
