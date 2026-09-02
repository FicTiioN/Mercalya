import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TomBadge =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'teal'
  | 'amber'
  | 'neutro'
  | 'purple'

const tons: Record<TomBadge, string> = {
  success: 'bg-success-50 text-success border-success-100',
  warning: 'bg-warning-50 text-[#B57407] border-warning-100',
  danger: 'bg-danger-50 text-danger border-danger-100',
  info: 'bg-info-50 text-info border-info-100',
  teal: 'bg-teal-50 text-teal border-teal-100',
  amber: 'bg-amber-50 text-[#B57407] border-amber-100',
  neutro: 'bg-surface-2 text-muted border-line',
  purple: 'bg-[#F1EDFC] text-[#6D4FD0] border-[#E2DAF8]',
}

export interface BadgeProps {
  tom?: TomBadge
  children: ReactNode
  className?: string
  ponto?: boolean
  icone?: ReactNode
}

export function Badge({ tom = 'neutro', children, className, ponto, icone }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium leading-none',
        tons[tom],
        className,
      )}
    >
      {ponto && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {icone}
      {children}
    </span>
  )
}

/** Badge de status com mapeamento semântico reutilizado em toda a aplicação. */
const mapaStatus: Record<string, { tom: TomBadge; label: string }> = {
  ativo: { tom: 'success', label: 'Ativo' },
  inativo: { tom: 'neutro', label: 'Inativo' },
  disponivel: { tom: 'success', label: 'Disponível' },
  atencao: { tom: 'amber', label: 'Atenção' },
  critico: { tom: 'danger', label: 'Crítico' },
  normal: { tom: 'success', label: 'Normal' },
  'estoque-baixo': { tom: 'amber', label: 'Estoque baixo' },
  concluido: { tom: 'success', label: 'Concluído' },
  concluida: { tom: 'success', label: 'Concluída' },
  cancelado: { tom: 'danger', label: 'Cancelado' },
  cancelada: { tom: 'danger', label: 'Cancelada' },
  'em-andamento': { tom: 'amber', label: 'Em andamento' },
  pendente: { tom: 'neutro', label: 'Pendente' },
  aberta: { tom: 'amber', label: 'Aberta' },
  aprovado: { tom: 'success', label: 'Aprovado' },
  recusado: { tom: 'danger', label: 'Recusado' },
  estornado: { tom: 'purple', label: 'Estornado' },
  expirado: { tom: 'neutro', label: 'Expirado' },
  entregue: { tom: 'success', label: 'Entregue' },
  rascunho: { tom: 'neutro', label: 'Rascunho' },
  confirmada: { tom: 'success', label: 'Confirmada' },
  alta: { tom: 'danger', label: 'Alta' },
  media: { tom: 'amber', label: 'Média' },
  baixa: { tom: 'info', label: 'Baixa' },
  'em-conformidade': { tom: 'success', label: 'Em conformidade' },
  ENTRADA: { tom: 'success', label: 'Entrada' },
  TRANSFERENCIA: { tom: 'info', label: 'Transferência' },
  VENDA: { tom: 'neutro', label: 'Venda' },
  PERDA: { tom: 'danger', label: 'Perda' },
  AJUSTE: { tom: 'amber', label: 'Ajuste' },
  DEVOLUCAO: { tom: 'purple', label: 'Devolução' },
}

export interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
  ponto?: boolean
}

export function StatusBadge({ status, label, className, ponto }: StatusBadgeProps) {
  const config = mapaStatus[status] ?? { tom: 'neutro' as TomBadge, label: status }
  return (
    <Badge tom={config.tom} className={className} ponto={ponto}>
      {label ?? config.label}
    </Badge>
  )
}

/** Indicador textual de status usado nas tabelas da Loja (ponto + texto, sem pill). */
export function StatusDot({ status, label }: { status: string; label?: string }) {
  const config = mapaStatus[status] ?? { tom: 'neutro' as TomBadge, label: status }
  const cores: Record<TomBadge, string> = {
    success: 'bg-success text-success',
    warning: 'bg-warning text-[#B57407]',
    danger: 'bg-danger text-danger',
    info: 'bg-info text-info',
    teal: 'bg-teal text-teal',
    amber: 'bg-amber text-[#B57407]',
    neutro: 'bg-muted text-muted',
    purple: 'bg-[#6D4FD0] text-[#6D4FD0]',
  }
  const classe = cores[config.tom]
  return (
    <span className={cn('inline-flex items-center gap-2 text-body', classe.split(' ')[1])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', classe.split(' ')[0])} aria-hidden />
      {label ?? config.label}
    </span>
  )
}
