import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type VarianteBotao =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'amber'
  | 'danger'
  | 'danger-outline'
  | 'subtle'

export type TamanhoBotao = 'sm' | 'md' | 'lg'

const variantes: Record<VarianteBotao, string> = {
  primary:
    'bg-teal text-white border border-teal hover:bg-teal-dark hover:border-teal-dark active:bg-teal-dark',
  outline:
    'bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line active:bg-surface-2',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-ink',
  amber: 'bg-amber text-white border border-amber hover:bg-amber-dark hover:border-amber-dark',
  danger: 'bg-danger text-white border border-danger hover:brightness-95',
  'danger-outline':
    'bg-surface text-danger border border-danger/40 hover:bg-danger-50 hover:border-danger/60',
  subtle: 'bg-teal-50 text-teal border border-teal-100 hover:bg-teal-100',
}

const tamanhos: Record<TamanhoBotao, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-11 px-4 text-body gap-2 rounded-md',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-md',
}

const base =
  'inline-flex items-center justify-center font-medium transition-all duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  carregando?: boolean
  iconeEsquerda?: ReactNode
  iconeDireita?: ReactNode
  blocoCompleto?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variante = 'primary',
    tamanho = 'md',
    carregando = false,
    iconeEsquerda,
    iconeDireita,
    blocoCompleto,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={cn(
        base,
        variantes[variante],
        tamanhos[tamanho],
        blocoCompleto && 'w-full',
        className,
      )}
      {...props}
    >
      {carregando ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        iconeEsquerda
      )}
      {children}
      {!carregando && iconeDireita}
    </button>
  )
})

export interface LinkButtonProps {
  to: string
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  iconeEsquerda?: ReactNode
  iconeDireita?: ReactNode
  blocoCompleto?: boolean
  className?: string
  children: ReactNode
}

export function LinkButton({
  to,
  variante = 'primary',
  tamanho = 'md',
  iconeEsquerda,
  iconeDireita,
  blocoCompleto,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={cn(
        base,
        variantes[variante],
        tamanhos[tamanho],
        blocoCompleto && 'w-full',
        className,
      )}
    >
      {iconeEsquerda}
      {children}
      {iconeDireita}
    </Link>
  )
}
