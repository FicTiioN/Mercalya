import { useNavigate } from 'react-router-dom'
import { Check, Keyboard, LogOut, Store, User } from 'lucide-react'
import { AppSession, AuthService } from '@/services'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Misc'

export interface UsuarioMenuProps {
  usuario: { nome: string; iniciais: string; funcao: string; email: string }
  aoFechar: () => void
  aoAbrirAtalhos: () => void
}

/**
 * Menu da conta. Além da identidade, é o lugar canônico do **contexto de
 * loja** — o mesmo padrão de "workspace" usado por outros sistemas: quem eu
 * sou, onde estou operando e como saio daqui.
 */
export function UsuarioMenu({
  usuario,
  aoFechar,
  aoAbrirAtalhos,
}: UsuarioMenuProps) {
  const navegar = useNavigate()
  const lojas = AppSession.lojasDisponiveis()

  return (
    <div
      role="menu"
      aria-label="Conta"
      className="absolute right-0 top-[calc(100%+8px)] z-30 w-[328px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-slide-up"
    >
      {/* ------------------------------ identidade ----------------------------- */}
      <div className="flex items-start gap-3 border-b border-line px-4 py-4">
        <Avatar iniciais={usuario.iniciais} tamanho="lg" className="h-11 w-11 text-body" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-card-title font-semibold text-ink">
            {usuario.nome}
          </p>
          <p className="mt-0.5 truncate text-caption text-muted">{usuario.email}</p>
          <span className="mt-1.5 inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal">
            {usuario.funcao}
          </span>
        </div>
      </div>

      {/* ------------------------------ loja atual ----------------------------- */}
      <div className="border-b border-line py-2">
        <p className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {lojas.length > 1 ? 'Trocar de loja' : 'Loja em uso'}
        </p>

        {lojas.map((loja) => (
          <button
            key={loja.id}
            type="button"
            role="menuitemradio"
            aria-checked={loja.ativa}
            disabled={lojas.length === 1}
            onClick={aoFechar}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
              lojas.length > 1 && 'hover:bg-surface-2',
              lojas.length === 1 && 'cursor-default',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                loja.ativa ? 'bg-teal-50 text-teal' : 'bg-surface-2 text-muted',
              )}
              aria-hidden
            >
              <Store className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-label font-medium text-ink">{loja.nome}</span>
              <span className="block truncate text-caption text-muted">{loja.condominio}</span>
            </span>
            {loja.ativa && (
              <Check className="h-4 w-4 shrink-0 text-teal" strokeWidth={2} aria-label="Em uso" />
            )}
          </button>
        ))}
      </div>

      {/* -------------------------------- ações -------------------------------- */}
      <div className="py-1.5">
        <ItemMenu
          icone={<User className="h-4 w-4" strokeWidth={1.75} />}
          onClick={() => {
            navegar('/configuracoes')
            aoFechar()
          }}
        >
          Meu perfil
        </ItemMenu>

        <ItemMenu
          icone={<Keyboard className="h-4 w-4" strokeWidth={1.75} />}
          atalho="?"
          onClick={() => {
            aoAbrirAtalhos()
            aoFechar()
          }}
        >
          Atalhos do teclado
        </ItemMenu>
      </div>

      {/* --------------------------------- sair -------------------------------- */}
      <div className="border-t border-line py-1.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            aoFechar()
            AuthService.sair()
            navegar('/login', { replace: true })
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-body text-danger transition-colors hover:bg-danger-50"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Sair
        </button>
      </div>

      <p className="border-t border-line bg-bg/50 px-4 py-2.5 text-caption text-muted">
        Mercalya 2.0 · ambiente de demonstração
      </p>
    </div>
  )
}

function ItemMenu({
  icone,
  children,
  atalho,
  onClick,
}: {
  icone: React.ReactNode
  children: React.ReactNode
  atalho?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-body text-ink transition-colors hover:bg-surface-2"
    >
      <span className="shrink-0 text-muted">{icone}</span>
      <span className="flex-1">{children}</span>
      {atalho && (
        <kbd className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
          {atalho}
        </kbd>
      )}
    </button>
  )
}
