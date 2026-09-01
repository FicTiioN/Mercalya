import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { navegacao } from '@/app/navigation'
import { Logo } from './Logo'

export interface AppSidebarProps {
  /** Controla o drawer da sidebar abaixo de lg. */
  abertaNoMobile: boolean
  aoFecharMobile: () => void
}

export function AppSidebar({ abertaNoMobile, aoFecharMobile }: AppSidebarProps) {
  const { pathname } = useLocation()

  // Grupo aberto: apenas um por vez. Abre sozinho quando a rota é filha dele.
  const grupoDaRota =
    navegacao.find((e) => e.tipo === 'grupo' && pathname.startsWith(e.prefixo))?.chave ?? null

  const [grupoAberto, setGrupoAberto] = useState<string | null>(grupoDaRota)

  useEffect(() => {
    if (grupoDaRota) setGrupoAberto(grupoDaRota)
  }, [grupoDaRota])

  return (
    <>
      {abertaNoMobile && (
        <div
          className="fixed inset-0 z-40 bg-ink/25 animate-fade-in lg:hidden"
          onClick={aoFecharMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col border-r border-line bg-surface',
          'transition-transform duration-200 lg:translate-x-0',
          abertaNoMobile ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative flex flex-col px-5 pb-5 pt-7">
          <Logo />
          <button
            type="button"
            onClick={aoFecharMobile}
            aria-label="Fechar menu"
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 lg:hidden"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mx-5 border-t border-line" />

        <nav className="flex-1 overflow-y-auto px-3.5 py-4 no-scrollbar">
          <ul className="space-y-1">
            {navegacao.map((entrada) => {
              if (entrada.tipo === 'link') {
                const Icone = entrada.icone
                return (
                  <li key={entrada.chave}>
                    <NavLink
                      to={entrada.rota}
                      onClick={aoFecharMobile}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md border px-3 py-2.5 text-body transition-colors',
                          isActive
                            ? 'border-teal-100 bg-teal-50 font-semibold text-teal'
                            : 'border-transparent text-ink hover:bg-surface-2',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icone
                            className={cn('h-5 w-5 shrink-0', isActive ? 'text-teal' : 'text-muted')}
                            strokeWidth={1.75}
                          />
                          {entrada.rotulo}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              }

              const Icone = entrada.icone
              const contemRota = pathname.startsWith(entrada.prefixo)
              const aberto = grupoAberto === entrada.chave

              return (
                <li key={entrada.chave}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    onClick={() => setGrupoAberto(aberto ? null : entrada.chave)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-body transition-colors',
                      contemRota
                        ? 'border-teal-100 bg-teal-50 font-semibold text-teal'
                        : 'border-transparent text-ink hover:bg-surface-2',
                    )}
                  >
                    <Icone
                      className={cn('h-5 w-5 shrink-0', contemRota ? 'text-teal' : 'text-muted')}
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 text-left">{entrada.rotulo}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        contemRota ? 'text-teal' : 'text-muted',
                        aberto && 'rotate-180',
                      )}
                      strokeWidth={1.75}
                    />
                  </button>

                  {aberto && (
                    <ul className="mt-1 space-y-0.5 pl-3.5">
                      {entrada.itens.map((item) => (
                        <li key={item.rota}>
                          <NavLink
                            to={item.rota}
                            onClick={aoFecharMobile}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-2.5 rounded-md py-2 pl-3.5 pr-3 text-body transition-colors',
                                isActive
                                  ? 'bg-teal-50 font-medium text-teal'
                                  : 'text-muted hover:bg-surface-2 hover:text-ink',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                    isActive ? 'bg-teal' : 'bg-line',
                                  )}
                                  aria-hidden
                                />
                                {item.rotulo}
                              </>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

      </aside>
    </>
  )
}
