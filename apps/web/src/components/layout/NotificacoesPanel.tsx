import { useNavigate } from 'react-router-dom'
import {
  CheckCheck,
  CircleCheck,
  PackageX,
  ShoppingCart,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import type { Notificacao, TipoNotificacao } from '@/models'
import { cn } from '@/lib/cn'
import { quando as formatarQuando } from '@/lib/format'
import { EmptyState, SkeletonLinhas } from '@/components/ui/Feedback'

const icones: Record<TipoNotificacao, LucideIcon> = {
  estoque: TriangleAlert,
  validade: PackageX,
  abastecimento: Truck,
  compra: ShoppingCart,
  perda: TriangleAlert,
  sistema: CircleCheck,
}

const tons = {
  critico: 'bg-danger-50 text-danger',
  atencao: 'bg-amber-50 text-[#D68A0F]',
  info: 'bg-info-50 text-info',
  sucesso: 'bg-success-50 text-success',
} as const

export interface NotificacoesPanelProps {
  itens: Notificacao[]
  naoLidas: number
  carregando: boolean
  aoFechar: () => void
  aoMarcarTodas: () => void
  aoAbrir: (notificacao: Notificacao) => void
}

export function NotificacoesPanel({
  itens,
  naoLidas,
  carregando,
  aoFechar,
  aoMarcarTodas,
  aoAbrir,
}: NotificacoesPanelProps) {
  const navegar = useNavigate()

  return (
    <div
      role="dialog"
      aria-label="Notificações"
      className="absolute right-0 top-[calc(100%+8px)] z-30 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-slide-up"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-card-title font-semibold text-ink">Notificações</h2>
          {naoLidas > 0 && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
              {naoLidas} {naoLidas === 1 ? 'nova' : 'novas'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={aoMarcarTodas}
          disabled={naoLidas === 0}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium text-teal transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
        >
          <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          Marcar todas como lidas
        </button>
      </header>

      <div className="max-h-[380px] overflow-y-auto">
        {carregando ? (
          <div className="p-4">
            <SkeletonLinhas linhas={3} />
          </div>
        ) : itens.length === 0 ? (
          <EmptyState
            compacto
            icone={<CircleCheck className="h-5 w-5" strokeWidth={1.5} />}
            titulo="Nenhuma notificação"
            descricao="Você está em dia com a operação."
          />
        ) : (
          <ul>
            {itens.map((notificacao) => {
              const Icone = icones[notificacao.tipo]
              return (
                <li key={notificacao.id}>
                  <button
                    type="button"
                    onClick={() => {
                      aoAbrir(notificacao)
                      navegar(notificacao.rota)
                      aoFechar()
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2/70',
                      !notificacao.lida && 'bg-teal-50/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        tons[notificacao.severidade],
                      )}
                      aria-hidden
                    >
                      <Icone className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span
                          className={cn(
                            'block flex-1 text-label leading-snug text-ink',
                            !notificacao.lida && 'font-semibold',
                          )}
                        >
                          {notificacao.titulo}
                        </span>
                        {!notificacao.lida && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal"
                            aria-label="Não lida"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block text-caption leading-snug text-muted">
                        {notificacao.descricao}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted">
                        {formatarQuando(notificacao.quando)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-line">
        <button
          type="button"
          onClick={() => {
            navegar('/operacao/movimentacoes')
            aoFechar()
          }}
          className="w-full px-4 py-3 text-center text-label font-medium text-teal transition-colors hover:bg-teal-50"
        >
          Ver todas as movimentações
        </button>
      </footer>
    </div>
  )
}
