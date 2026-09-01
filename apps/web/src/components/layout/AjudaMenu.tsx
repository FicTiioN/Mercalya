import { useNavigate } from 'react-router-dom'
import { BookOpen, Keyboard, LifeBuoy, Sparkles } from 'lucide-react'
import { ATALHOS_NAVEGACAO } from '@/lib/useAtalhos'
import { Dialog } from '@/components/ui/Dialog'

export interface AjudaMenuProps {
  aoFechar: () => void
  aoAbrirAtalhos: () => void
  aoAvisar: (titulo: string, descricao: string) => void
}

/** Menu do ícone de ajuda (`?`) no header. */
export function AjudaMenu({ aoFechar, aoAbrirAtalhos, aoAvisar }: AjudaMenuProps) {
  const navegar = useNavigate()

  const itens = [
    {
      icone: BookOpen,
      titulo: 'Guia de uso',
      descricao: 'Refaça o passo a passo da operação',
      acao: () => navegar('/inicio'),
    },
    {
      icone: Keyboard,
      titulo: 'Atalhos do teclado',
      descricao: 'Navegue sem tirar as mãos do teclado',
      atalho: '?',
      acao: aoAbrirAtalhos,
    },
    {
      icone: Sparkles,
      titulo: 'Novidades da versão',
      descricao: 'O que mudou nesta atualização',
      acao: () =>
        aoAvisar(
          'Mercalya 2.0',
          'Novo menu lateral, estoque por lote com validade e abastecimento por transferência.',
        ),
    },
    {
      icone: LifeBuoy,
      titulo: 'Falar com o suporte',
      descricao: 'Ainda não disponível nesta fase',
      acao: () =>
        aoAvisar(
          'Suporte',
          'O canal de atendimento será conectado junto com a API.',
        ),
    },
  ]

  return (
    <div
      role="menu"
      aria-label="Ajuda"
      className="absolute right-0 top-[calc(100%+8px)] z-30 w-[300px] overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-pop animate-slide-up"
    >
      <p className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        Ajuda
      </p>

      {itens.map((item) => {
        const Icone = item.icone
        return (
          <button
            key={item.titulo}
            type="button"
            role="menuitem"
            onClick={() => {
              item.acao()
              aoFechar()
            }}
            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <Icone className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-label font-medium text-ink">{item.titulo}</span>
              <span className="block text-caption text-muted">{item.descricao}</span>
            </span>
            {item.atalho && (
              <kbd className="mt-0.5 shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {item.atalho}
              </kbd>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Lista de atalhos realmente registrados pela aplicação. */
export function AtalhosDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const globais = [
    { teclas: ['⌘', 'K'], rotulo: 'Focar a busca global' },
    { teclas: ['?'], rotulo: 'Abrir esta lista de atalhos' },
    { teclas: ['Esc'], rotulo: 'Fechar painel, drawer ou diálogo' },
  ]

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Atalhos do teclado"
      descricao="Pressione G seguido da tecla do módulo para navegar."
      larguraMaxima="max-w-lg"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-3 text-label font-semibold text-ink">Geral</h3>
          <ul className="space-y-2.5">
            {globais.map((atalho) => (
              <li key={atalho.rotulo} className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted">{atalho.rotulo}</span>
                <span className="flex shrink-0 gap-1">
                  {atalho.teclas.map((tecla) => (
                    <Tecla key={tecla}>{tecla}</Tecla>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-label font-semibold text-ink">Navegação</h3>
          <ul className="space-y-2.5">
            {ATALHOS_NAVEGACAO.map((atalho) => (
              <li key={atalho.tecla} className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted">
                  {atalho.rotulo.replace('Ir para ', '')}
                </span>
                <span className="flex shrink-0 gap-1">
                  <Tecla>G</Tecla>
                  <Tecla>{atalho.tecla}</Tecla>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  )
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-line bg-surface-2 px-1.5 text-[11px] font-medium text-ink">
      {children}
    </kbd>
  )
}
