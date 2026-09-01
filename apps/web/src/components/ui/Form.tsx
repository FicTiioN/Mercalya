import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/* FormField — label acima, helper abaixo, erro substitui o helper.    */
/* ------------------------------------------------------------------ */

export interface FormFieldProps {
  label?: ReactNode
  obrigatorio?: boolean
  helper?: ReactNode
  erro?: string | null
  children: ReactNode
  className?: string
  htmlFor?: string
  /** Conteúdo alinhado à direita do label (ex.: contador de caracteres). */
  acessorio?: ReactNode
}

export function FormField({
  label,
  obrigatorio,
  helper,
  erro,
  children,
  className,
  htmlFor,
  acessorio,
}: FormFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="block text-label font-medium text-ink">
            {label}
            {obrigatorio && <span className="ml-0.5 text-danger">*</span>}
          </label>
          {acessorio}
        </div>
      )}
      {children}
      {erro ? (
        <span className="mt-1.5 block text-caption text-danger">{erro}</span>
      ) : (
        helper && <span className="mt-1.5 block text-caption text-muted">{helper}</span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  erro?: boolean
  iconeEsquerda?: ReactNode
  sufixo?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, erro, iconeEsquerda, sufixo, ...props },
  ref,
) {
  const campo = (
    <input
      ref={ref}
      className={cn(
        'mc-input',
        iconeEsquerda && 'pl-10',
        sufixo && 'rounded-r-none border-r-0',
        erro && 'border-danger focus-visible:border-danger focus-visible:ring-danger/25',
        className,
      )}
      {...props}
    />
  )

  if (!iconeEsquerda && !sufixo) return campo

  return (
    <div className="relative flex">
      {iconeEsquerda && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          {iconeEsquerda}
        </span>
      )}
      {campo}
      {sufixo && (
        <span className="flex h-11 items-center rounded-r-md border border-line bg-surface-2 px-3 text-label text-muted">
          {sufixo}
        </span>
      )}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

export interface OpcaoSelect {
  valor: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  opcoes: OpcaoSelect[]
  placeholder?: string
  erro?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { opcoes, placeholder, className, erro, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'mc-input cursor-pointer appearance-none pr-10',
          !props.value && placeholder && 'text-muted',
          erro && 'border-danger focus-visible:border-danger focus-visible:ring-danger/25',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { erro?: boolean }
>(function Textarea({ className, erro, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'mc-input h-auto min-h-[92px] resize-y py-3 leading-relaxed',
        erro && 'border-danger focus-visible:border-danger focus-visible:ring-danger/25',
        className,
      )}
      {...props}
    />
  )
})

/* ------------------------------------------------------------------ */
/* SearchInput — com botão de limpar, como nas referências.            */
/* ------------------------------------------------------------------ */

export interface SearchInputProps {
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function SearchInput({
  valor,
  aoMudar,
  placeholder = 'Buscar...',
  className,
  autoFocus,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        value={valor}
        autoFocus={autoFocus}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="mc-input pl-10 pr-10"
      />
      {valor && (
        <button
          type="button"
          onClick={() => aoMudar('')}
          aria-label="Limpar busca"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  ativo,
  aoMudar,
  label,
  id,
  desabilitado,
}: {
  ativo: boolean
  aoMudar: (v: boolean) => void
  label?: ReactNode
  id?: string
  desabilitado?: boolean
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={desabilitado}
      onClick={() => aoMudar(!ativo)}
      className="group inline-flex cursor-pointer items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {/*
        O botão de arrasto é ancorado por `left`: sem isso ele herda a posição
        estática, que dentro de um <button> é centralizada pelo navegador — era
        o que jogava o círculo para fora do trilho.
      */}
      <span
        className={cn(
          'relative block h-6 w-11 shrink-0 rounded-full transition-colors',
          'group-focus-visible:ring-2 group-focus-visible:ring-teal/30 group-focus-visible:ring-offset-2',
          ativo ? 'bg-teal' : 'bg-muted/30',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            ativo ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
      {label && <span className="text-body text-ink">{label}</span>}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* FilterBar — card branco com campos rotulados (padrão das listagens) */
/* ------------------------------------------------------------------ */

export function FilterBar({
  children,
  acoes,
  className,
}: {
  children: ReactNode
  acoes?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mc-card p-5', className)}>
      <div className="flex flex-wrap items-end gap-4">
        {children}
        {acoes && <div className="ml-auto flex items-end gap-2">{acoes}</div>}
      </div>
    </div>
  )
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-[180px] flex-1', className)}>
      <span className="mb-1.5 block text-label font-medium text-ink">{label}</span>
      {children}
    </div>
  )
}
