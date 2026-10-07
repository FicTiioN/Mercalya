import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, CircleHelp, Menu, Search, Store } from 'lucide-react'
import type { Notificacao } from '@/models'
import { AppSession, NotificacaoService } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { useLojaAtual } from '@/lib/useLojaAtual'
import { cn } from '@/lib/cn'
import { AjudaMenu } from './AjudaMenu'
import { UsuarioMenu } from './UsuarioMenu'
import { NotificacoesPanel } from './NotificacoesPanel'

export interface AppHeaderProps {
  usuario: { nome: string; iniciais: string; funcao: string; email: string }
  aoAbrirMenu: () => void
  aoAbrirAtalhos: () => void
  aoAvisar: (titulo: string, descricao: string) => void
}

const atalhosBusca = [
  { rotulo: 'Produtos', rota: '/cadastros/produtos' },
  { rotulo: 'Fornecedores', rota: '/cadastros/fornecedores' },
  { rotulo: 'Nova compra', rota: '/operacao/compras/nova' },
  { rotulo: 'Estoque central', rota: '/operacao/estoque-central' },
  { rotulo: 'Abastecimento', rota: '/operacao/abastecimento' },
  { rotulo: 'Movimentações', rota: '/operacao/movimentacoes' },
  { rotulo: 'Perdas e ajustes', rota: '/operacao/perdas-ajustes' },
]

type PainelAberto = 'notificacoes' | 'ajuda' | 'usuario' | null

export function AppHeader({
  usuario,
  aoAbrirMenu,
  aoAbrirAtalhos,
  aoAvisar,
}: AppHeaderProps) {
  const navegar = useNavigate()
  const buscaRef = useRef<HTMLInputElement>(null)
  const [busca, setBusca] = useState('')
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false)
  const [painel, setPainel] = useState<PainelAberto>(null)

  const notificacoes = useRecurso(() => NotificacaoService.listar(), [])

  // Com mais de uma loja, a loja em contexto fica visível no header — e o
  // clique abre o menu da conta, onde se troca.
  const lojaId = useLojaAtual()
  const lojas = AppSession.lojasDisponiveis()
  const lojaAtual = lojas.find((l) => l.id === lojaId)

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        buscaRef.current?.focus()
      }
      if (e.key === 'Escape') setPainel(null)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const alternar = (alvo: Exclude<PainelAberto, null>) =>
    setPainel((atual) => (atual === alvo ? null : alvo))

  const abrirNotificacao = async (notificacao: Notificacao) => {
    if (notificacao.lida) return
    await NotificacaoService.marcarComoLida(notificacao.id)
    notificacoes.recarregar()
  }

  const marcarTodas = async () => {
    await NotificacaoService.marcarTodasComoLidas()
    notificacoes.recarregar()
  }

  const naoLidas = notificacoes.dados?.naoLidas ?? 0
  const filtradas = busca
    ? atalhosBusca.filter((a) => a.rotulo.toLowerCase().includes(busca.toLowerCase()))
    : atalhosBusca

  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <button
        type="button"
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
        className="-ml-2 rounded-md p-2 text-muted transition-colors hover:bg-surface-2 lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="relative w-full max-w-[480px]">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          ref={buscaRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={() => setSugestoesAbertas(true)}
          onBlur={() => window.setTimeout(() => setSugestoesAbertas(false), 140)}
          placeholder="Buscar produtos, categorias, fornecedores..."
          aria-label="Busca global"
          className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-16 text-body text-ink placeholder:text-muted/80 mc-focus"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface-2 px-1.5 py-1 text-[11px] font-medium text-muted">
          ⌘ K
        </kbd>

        {sugestoesAbertas && filtradas.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-pop animate-slide-up">
            <p className="px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              Ir para
            </p>
            {filtradas.slice(0, 5).map((atalho) => (
              <button
                key={atalho.rota}
                type="button"
                onMouseDown={() => {
                  navegar(atalho.rota)
                  setBusca('')
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-body text-ink transition-colors hover:bg-surface-2"
              >
                <Search className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                {atalho.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {lojas.length > 1 && lojaAtual && (
        <button
          type="button"
          onClick={() => alternar('usuario')}
          title="Trocar de loja"
          className="relative z-30 hidden items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label font-medium text-ink transition-colors hover:border-teal/40 md:inline-flex"
        >
          <Store className="h-4 w-4 text-teal" strokeWidth={1.75} />
          <span className="max-w-[180px] truncate">{lojaAtual.nome}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {painel !== null && (
          <div className="fixed inset-0 z-20" onClick={() => setPainel(null)} aria-hidden />
        )}

        {/* --------------------------- Notificações --------------------------- */}
        <div className="relative">
          <button
            type="button"
            aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ''}`}
            aria-expanded={painel === 'notificacoes'}
            onClick={() => alternar('notificacoes')}
            className={cn(
              'relative z-30 rounded-md p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink',
              painel === 'notificacoes' && 'bg-surface-2 text-ink',
            )}
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {naoLidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-semibold text-white">
                {naoLidas}
              </span>
            )}
          </button>

          {painel === 'notificacoes' && (
            <NotificacoesPanel
              itens={notificacoes.dados?.itens ?? []}
              naoLidas={naoLidas}
              carregando={notificacoes.carregando}
              aoFechar={() => setPainel(null)}
              aoMarcarTodas={() => void marcarTodas()}
              aoAbrir={(n) => void abrirNotificacao(n)}
            />
          )}
        </div>

        {/* ------------------------------ Ajuda ------------------------------- */}
        <div className="relative">
          <button
            type="button"
            aria-label="Ajuda e atalhos"
            aria-expanded={painel === 'ajuda'}
            onClick={() => alternar('ajuda')}
            className={cn(
              'relative z-30 rounded-md p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink',
              painel === 'ajuda' && 'bg-surface-2 text-ink',
            )}
          >
            <CircleHelp className="h-5 w-5" strokeWidth={1.75} />
          </button>

          {painel === 'ajuda' && (
            <AjudaMenu
              aoFechar={() => setPainel(null)}
              aoAbrirAtalhos={aoAbrirAtalhos}
              aoAvisar={aoAvisar}
            />
          )}
        </div>

        {/* ----------------------------- Usuário ------------------------------ */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => alternar('usuario')}
            aria-expanded={painel === 'usuario'}
            className={cn(
              'relative z-30 flex items-center gap-2.5 rounded-md py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-2',
              painel === 'usuario' && 'bg-surface-2',
            )}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-body font-semibold text-white"
              aria-hidden
            >
              {usuario.iniciais}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-label font-semibold leading-tight text-ink">
                {usuario.nome}
              </span>
              <span className="block text-caption leading-tight text-muted">{usuario.funcao}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted transition-transform',
                painel === 'usuario' && 'rotate-180',
              )}
              strokeWidth={1.75}
            />
          </button>

          {painel === 'usuario' && (
            <UsuarioMenu
              usuario={usuario}
              aoFechar={() => setPainel(null)}
              aoAbrirAtalhos={aoAbrirAtalhos}
            />
          )}
        </div>
      </div>
    </header>
  )
}
