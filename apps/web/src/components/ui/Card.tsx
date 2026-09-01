import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SectionCardProps {
  titulo?: ReactNode
  descricao?: ReactNode
  icone?: ReactNode
  acoes?: ReactNode
  children: ReactNode
  className?: string
  classeCorpo?: string
  /** Remove o padding do corpo — usado quando o conteúdo é uma tabela. */
  semPaddingCorpo?: boolean
  rodape?: ReactNode
}

export function SectionCard({
  titulo,
  descricao,
  icone,
  acoes,
  children,
  className,
  classeCorpo,
  semPaddingCorpo,
  rodape,
}: SectionCardProps) {
  const temCabecalho = Boolean(titulo || acoes || descricao)

  return (
    <section className={cn('mc-card flex flex-col overflow-hidden', className)}>
      {temCabecalho && (
        <header
          className={cn(
            'flex items-start justify-between gap-4 px-5 pt-5',
            semPaddingCorpo ? 'pb-4' : 'pb-0',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {icone && <span className="shrink-0 text-teal">{icone}</span>}
            <div className="min-w-0">
              {titulo && (
                <h2 className="font-display text-card-title font-semibold leading-snug text-ink">
                  {titulo}
                </h2>
              )}
              {descricao && <p className="mt-1 text-caption text-muted">{descricao}</p>}
            </div>
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}

      <div
        className={cn(
          'flex-1',
          !semPaddingCorpo && (temCabecalho ? 'p-5' : 'p-5'),
          classeCorpo,
        )}
      >
        {children}
      </div>

      {rodape && <div className="border-t border-line">{rodape}</div>}
    </section>
  )
}

/** Rodapé "Ver todos ..." recorrente nos cards de lista das referências. */
export function CardFooterLink({
  children,
  onClick,
  href,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
}) {
  const classe =
    'flex w-full items-center justify-center gap-1 px-5 py-3.5 text-label font-medium text-teal transition-colors hover:bg-teal-50'

  if (href) {
    return (
      <a className={classe} href={href}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classe} onClick={onClick}>
      {children}
    </button>
  )
}
