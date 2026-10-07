import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Barcode,
  CircleCheckBig,
  CircleX,
  CreditCard,
  LogOut,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { ItemLojaView } from '@/models'
import { AppSession, PROVEDOR_PAGAMENTO, ROTULOS_PAGAMENTO } from '@/services'
import { cn } from '@/lib/cn'
import { moeda } from '@/lib/format'
import { Logo, LogoCompacta } from '@/components/layout/Logo'
import { ProductAvatar } from '@/components/ui/Misc'
import { VISUAL_PAGAMENTO } from '@/pages/vendas/pagamento'
import { FORMAS_TOTEM, useTotem, VOLTAR_AO_INICIO_S, type FormaTotem, type Totem } from './useTotem'

/**
 * O totem de autoatendimento.
 *
 * Quem está na frente desta tela é o cliente, não o operador — por isso ela
 * vive fora do `AppShell`: sem menu, sem header, sem atalhos. Tudo é grande e
 * feito para o dedo; nenhuma ação depende de hover.
 *
 * O leitor de código de barras é um teclado: manda o código e Enter. O campo
 * de busca fica sempre focado para recebê-lo, e o cliente pode digitar o nome
 * quando o produto não tem código.
 */
export function TotemPage() {
  const t = useTotem()
  const [termo, setTermo] = useState('')

  // Na tela inicial, a primeira leitura do código já começa a compra — o
  // caractere que chegou vira o começo da busca em vez de se perder.
  useEffect(() => {
    if (t.etapa.tipo !== 'inicio') return
    const aoTeclar = (e: globalThis.KeyboardEvent) => {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
      setTermo(e.key)
      t.comecar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [t])

  return (
    <div className="flex h-screen select-none flex-col bg-bg text-ink">
      {t.etapa.tipo !== 'inicio' && <Cabecalho totem={t} />}

      <main className="flex min-h-0 flex-1 flex-col">
        {t.etapa.tipo === 'inicio' && <TelaInicio totem={t} />}
        {t.etapa.tipo === 'carrinho' && (
          <TelaCarrinho totem={t} termo={termo} setTermo={setTermo} />
        )}
        {t.etapa.tipo === 'pagamento' && <TelaPagamento totem={t} />}
        {t.etapa.tipo === 'aguardando' && <TelaAguardando totem={t} etapa={t.etapa} />}
        {t.etapa.tipo === 'aprovado' && <TelaAprovado totem={t} etapa={t.etapa} />}
        {t.etapa.tipo === 'recusado' && <TelaRecusado totem={t} etapa={t.etapa} />}
        {t.etapa.tipo === 'falha' && <TelaFalha totem={t} etapa={t.etapa} />}
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Cabeçalho                                                                  */
/* -------------------------------------------------------------------------- */

function Cabecalho({ totem: t }: { totem: Totem }) {
  const podeCancelar = t.etapa.tipo !== 'aprovado' && t.etapa.tipo !== 'falha'
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-4">
        <LogoCompacta escala={0.9} />
        <span className="hidden text-body text-muted sm:inline">{AppSession.lojaAtual()}</span>
      </div>
      {podeCancelar && (
        <BotaoGrande
          tom="perigo-suave"
          tamanho="md"
          onClick={() => void t.cancelarCompra()}
          disabled={t.ocupado}
          icone={<X className="h-5 w-5" strokeWidth={2} />}
        >
          Cancelar compra
        </BotaoGrande>
      )}
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* Início                                                                     */
/* -------------------------------------------------------------------------- */

function TelaInicio({ totem: t }: { totem: Totem }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6">
      <button
        type="button"
        onClick={t.comecar}
        disabled={t.carregandoCatalogo}
        className="flex flex-col items-center gap-10 rounded-3xl px-12 py-14 text-center transition-colors hover:bg-surface active:bg-surface-2 disabled:opacity-60"
      >
        <Logo className="w-[220px]" />
        <div>
          <p className="font-display text-[44px] font-bold leading-tight tracking-[-0.02em] text-ink">
            Toque para começar
          </p>
          <p className="mt-3 text-[20px] text-muted">
            {t.carregandoCatalogo
              ? 'Carregando os produtos da loja...'
              : 'ou passe o código de barras do primeiro produto'}
          </p>
        </div>
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal text-white shadow-pop">
          <Barcode className="h-9 w-9" strokeWidth={1.75} />
        </span>
      </button>

      {t.erro && <Aviso className="mt-8 max-w-[520px]">{t.erro}</Aviso>}

      <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-caption text-muted">
        <span>{AppSession.lojaAtual()}</span>
        <div className="flex items-center gap-4">
          <BotaoTelaCheia />
          <Link to="/inicio" className="inline-flex items-center gap-1.5 hover:text-ink">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> Sair do totem
          </Link>
        </div>
      </div>
    </div>
  )
}

function BotaoTelaCheia() {
  const [cheia, setCheia] = useState(Boolean(document.fullscreenElement))

  useEffect(() => {
    const ao = () => setCheia(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', ao)
    return () => document.removeEventListener('fullscreenchange', ao)
  }, [])

  const alternar = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* navegador sem suporte ou gesto não aceito: segue sem tela cheia */
    }
  }

  return (
    <button type="button" onClick={() => void alternar()} className="inline-flex items-center gap-1.5 hover:text-ink">
      {cheia ? (
        <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      )}
      {cheia ? 'Sair da tela cheia' : 'Tela cheia'}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Carrinho                                                                   */
/* -------------------------------------------------------------------------- */

function TelaCarrinho({
  totem: t,
  termo,
  setTermo,
}: {
  totem: Totem
  termo: string
  setTermo: (v: string) => void
}) {
  const campo = useRef<HTMLInputElement>(null)
  const sugestoes = termo.trim().length >= 2 ? t.buscar(termo) : []

  // O leitor precisa do foco sempre no campo; qualquer toque em outro lugar
  // devolve o foco para ele.
  const focar = () => campo.current?.focus()
  useEffect(focar, [t.itens.length])

  const confirmar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !termo.trim()) return
    e.preventDefault()
    if (t.confirmarBusca(termo)) setTermo('')
  }

  const escolher = (p: ItemLojaView) => {
    if (t.adicionar(p)) setTermo('')
    focar()
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      {/* ------------------------------ busca ------------------------------ */}
      <section className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6" onClick={focar}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            ref={campo}
            autoFocus
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value)
              if (t.erro) t.limparErro()
            }}
            onKeyDown={confirmar}
            placeholder="Passe o código de barras ou digite o nome"
            autoComplete="off"
            className="mc-input h-16 w-full rounded-2xl pl-14 pr-14 text-[20px]"
          />
          {termo && (
            <button
              type="button"
              onClick={() => setTermo('')}
              aria-label="Limpar busca"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>

        {t.erro && <Aviso>{t.erro}</Aviso>}

        {sugestoes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {sugestoes.map((p) => (
              <button
                key={p.produtoId}
                type="button"
                onClick={() => escolher(p)}
                disabled={p.quantidade <= 0}
                className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-teal/50 active:bg-surface-2 disabled:opacity-50"
              >
                <ProductAvatar imagem={p.produtoImagem} nome={p.produtoNome} tamanho="lg" />
                <span className="line-clamp-2 min-h-[44px] text-[16px] font-medium leading-snug text-ink">
                  {p.produtoNome}
                </span>
                <span className="font-display text-[20px] font-bold text-teal">
                  {p.quantidade <= 0 ? 'Esgotado' : moeda(p.precoVenda)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted">
            <Barcode className="h-16 w-16 text-line" strokeWidth={1.25} />
            <p className="max-w-[360px] text-[17px] leading-relaxed">
              {termo.trim().length >= 2
                ? 'Nenhum produto encontrado com esse nome.'
                : 'Passe o código de barras de cada produto. Sem código, digite o nome e toque no produto.'}
            </p>
          </div>
        )}
      </section>

      {/* ----------------------------- carrinho ---------------------------- */}
      <aside className="flex min-h-0 flex-col border-t border-line bg-surface lg:border-l lg:border-t-0">
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <ShoppingCart className="h-6 w-6 text-teal" strokeWidth={1.75} />
          <h2 className="font-display text-[20px] font-semibold">Sua compra</h2>
          <span className="ml-auto text-body text-muted">
            {t.itens.reduce((acc, i) => acc + i.quantidade, 0)}{' '}
            {t.itens.reduce((acc, i) => acc + i.quantidade, 0) === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {t.itens.length === 0 && (
            <li className="flex h-full items-center justify-center p-8 text-center text-[16px] text-muted">
              Os produtos que você passar aparecem aqui.
            </li>
          )}
          {t.itens.map((i) => (
            <li key={i.produtoId} className="flex items-center gap-4 px-6 py-4">
              <ProductAvatar imagem={i.imagem} nome={i.nome} tamanho="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-medium text-ink">{i.nome}</p>
                <p className="text-body text-muted">{moeda(i.preco)} cada</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-bg p-1">
                <BotaoQuantidade
                  aria-label="Diminuir"
                  onClick={() => t.alterarQuantidade(i.produtoId, -1)}
                >
                  <Minus className="h-5 w-5" strokeWidth={2} />
                </BotaoQuantidade>
                <span className="w-9 text-center font-display text-[18px] font-semibold tabular">
                  {i.quantidade}
                </span>
                <BotaoQuantidade
                  aria-label="Aumentar"
                  onClick={() => t.alterarQuantidade(i.produtoId, +1)}
                  disabled={i.quantidade >= i.disponivel}
                >
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </BotaoQuantidade>
              </div>
              <span className="w-[88px] text-right font-display text-[18px] font-semibold tabular text-ink">
                {moeda(i.preco * i.quantidade)}
              </span>
              <button
                type="button"
                onClick={() => t.remover(i.produtoId)}
                aria-label={`Remover ${i.nome}`}
                className="rounded-lg p-2 text-muted hover:bg-danger-50 hover:text-danger"
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-line p-6">
          <div className="flex items-end justify-between">
            <span className="text-[17px] text-muted">Total</span>
            <span className="font-display text-[40px] font-bold leading-none tabular text-ink">
              {moeda(t.total)}
            </span>
          </div>
          <BotaoGrande
            tom="primario"
            tamanho="xl"
            className="mt-5 w-full"
            disabled={t.itens.length === 0}
            onClick={t.irParaPagamento}
            icone={<CreditCard className="h-6 w-6" strokeWidth={1.75} />}
          >
            Pagar
          </BotaoGrande>
        </div>
      </aside>
    </div>
  )
}

function BotaoQuantidade({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface active:bg-surface-2 disabled:opacity-30',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Pagamento — escolha da forma                                               */
/* -------------------------------------------------------------------------- */

const ICONES_FORMA: Record<FormaTotem, typeof CreditCard> = {
  'cartao-credito': CreditCard,
  'cartao-debito': CreditCard,
  pix: QrCode,
}

function TelaPagamento({ totem: t }: { totem: Totem }) {
  return (
    <Centro>
      <p className="text-[20px] text-muted">Total a pagar</p>
      <p className="mt-2 font-display text-[64px] font-bold leading-none tabular text-ink">
        {moeda(t.venda?.status === 'aberta' ? t.venda.total : t.total)}
      </p>

      <p className="mt-10 text-[20px] font-medium text-ink">Como você quer pagar?</p>

      <div className="mt-6 grid w-full max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-3">
        {FORMAS_TOTEM.map((forma) => {
          const Icone = ICONES_FORMA[forma]
          return (
            <button
              key={forma}
              type="button"
              onClick={() => void t.pagar(forma)}
              disabled={t.ocupado}
              className="flex flex-col items-center gap-4 rounded-3xl border-2 border-line bg-surface px-6 py-10 shadow-card transition-all hover:border-teal hover:shadow-pop active:scale-[0.98] disabled:opacity-60"
            >
              <span
                className={cn(
                  'inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-2',
                  VISUAL_PAGAMENTO[forma].classe,
                )}
              >
                <Icone className="h-10 w-10" strokeWidth={1.5} />
              </span>
              <span className="font-display text-[22px] font-semibold text-ink">
                {ROTULOS_PAGAMENTO[forma]}
              </span>
            </button>
          )
        })}
      </div>

      {t.erro && <Aviso className="mt-8 max-w-[600px]">{t.erro}</Aviso>}

      <button
        type="button"
        onClick={() => void t.voltarAoCarrinho()}
        disabled={t.ocupado}
        className="mt-10 text-[17px] text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Voltar e alterar os produtos
      </button>
    </Centro>
  )
}

/* -------------------------------------------------------------------------- */
/* Aguardando a maquininha                                                    */
/* -------------------------------------------------------------------------- */

function TelaAguardando({
  totem: t,
  etapa,
}: {
  totem: Totem
  etapa: Extract<Totem['etapa'], { tipo: 'aguardando' }>
}) {
  const Icone = ICONES_FORMA[etapa.forma]
  const pix = etapa.forma === 'pix'
  return (
    <Centro>
      <span className="relative inline-flex h-32 w-32 items-center justify-center rounded-full bg-teal-50 text-teal">
        <span className="absolute inset-0 animate-ping rounded-full bg-teal/15" aria-hidden />
        <Icone className="h-14 w-14" strokeWidth={1.5} />
      </span>

      <h2 className="mt-10 font-display text-[40px] font-bold leading-tight tracking-[-0.02em]">
        {pix ? 'Leia o QR Code na maquininha' : 'Aproxime, insira ou passe o cartão'}
      </h2>
      <p className="mt-3 text-[20px] text-muted">
        {ROTULOS_PAGAMENTO[etapa.forma]} ·{' '}
        <span className="font-semibold tabular text-ink">{moeda(etapa.pagamento.valor)}</span>
      </p>

      {t.erro && <Aviso className="mt-8 max-w-[600px]">{t.erro}</Aviso>}

      <BotaoGrande
        tom="perigo-suave"
        tamanho="lg"
        className="mt-12"
        onClick={() => void t.abortar()}
        disabled={t.ocupado}
        icone={<X className="h-5 w-5" strokeWidth={2} />}
      >
        Cancelar pagamento
      </BotaoGrande>

      {PROVEDOR_PAGAMENTO === 'simulado' && <PainelSimulador totem={t} />}
    </Centro>
  )
}

/**
 * Só existe com a maquininha simulada. Numa instalação real este bloco não
 * aparece — o cliente aproxima um cartão de verdade.
 */
function PainelSimulador({ totem: t }: { totem: Totem }) {
  return (
    <div className="mt-14 w-full max-w-[560px] rounded-2xl border-2 border-dashed border-amber/60 bg-amber-50 p-5 text-left">
      <p className="text-label font-semibold uppercase tracking-[0.08em] text-[#B57407]">
        Maquininha simulada
      </p>
      <p className="mt-1 text-body text-ink/70">
        Não há terminal físico. Estes botões fazem o que o cliente faria na maquininha.
      </p>
      <div className="mt-4 flex gap-3">
        <BotaoGrande
          tom="sucesso"
          tamanho="md"
          className="flex-1"
          onClick={() => void t.simular('aprovar')}
          icone={<CircleCheckBig className="h-5 w-5" strokeWidth={2} />}
        >
          Aproximar cartão
        </BotaoGrande>
        <BotaoGrande
          tom="perigo-suave"
          tamanho="md"
          className="flex-1"
          onClick={() => void t.simular('recusar')}
          icone={<CircleX className="h-5 w-5" strokeWidth={2} />}
        >
          Emissor recusa
        </BotaoGrande>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Resultados                                                                 */
/* -------------------------------------------------------------------------- */

function TelaAprovado({
  totem: t,
  etapa,
}: {
  totem: Totem
  etapa: Extract<Totem['etapa'], { tipo: 'aprovado' }>
}) {
  const segundos = useContagem(VOLTAR_AO_INICIO_S)
  const { venda, pagamento } = etapa
  const cartao = pagamento.forma !== 'pix'

  return (
    <Centro>
      <span className="inline-flex h-32 w-32 items-center justify-center rounded-full bg-success-50 text-success">
        <CircleCheckBig className="h-16 w-16" strokeWidth={1.5} />
      </span>
      <h2 className="mt-8 font-display text-[44px] font-bold leading-tight tracking-[-0.02em]">
        Pagamento aprovado
      </h2>
      <p className="mt-2 text-[22px] text-muted">Obrigado pela compra!</p>

      <div className="mt-8 w-full max-w-[520px] rounded-2xl border border-line bg-surface p-6 text-left shadow-card">
        <div className="flex items-baseline justify-between">
          <span className="text-body text-muted">Venda</span>
          <span className="font-display text-[17px] font-semibold">#{venda.numero}</span>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {venda.itens.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2 text-[15px]">
              <span className="min-w-0 truncate text-ink">
                <span className="tabular text-muted">{i.quantidade}×</span> {i.produtoNome}
              </span>
              <span className="ml-4 shrink-0 tabular">{moeda(i.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <span className="text-body text-muted">
            {ROTULOS_PAGAMENTO[pagamento.forma]}
            {cartao && pagamento.bandeira && ` · ${pagamento.bandeira}`}
            {cartao && pagamento.ultimosDigitos && ` •••• ${pagamento.ultimosDigitos}`}
            {pagamento.autorizacao && (
              <span className="block text-caption">Autorização {pagamento.autorizacao}</span>
            )}
          </span>
          <span className="font-display text-[28px] font-bold tabular">{moeda(venda.total)}</span>
        </div>
      </div>

      <BotaoGrande tom="primario" tamanho="lg" className="mt-10" onClick={t.reiniciar}>
        Nova compra
      </BotaoGrande>
      <p className="mt-4 text-body text-muted">Voltando ao início em {segundos}s</p>
    </Centro>
  )
}

function TelaRecusado({
  totem: t,
  etapa,
}: {
  totem: Totem
  etapa: Extract<Totem['etapa'], { tipo: 'recusado' }>
}) {
  return (
    <Centro>
      <span className="inline-flex h-32 w-32 items-center justify-center rounded-full bg-danger-50 text-danger">
        <CircleX className="h-16 w-16" strokeWidth={1.5} />
      </span>
      <h2 className="mt-8 font-display text-[40px] font-bold leading-tight tracking-[-0.02em]">
        {etapa.titulo}
      </h2>
      <p className="mt-3 max-w-[520px] text-[20px] text-muted">{etapa.motivo}</p>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row">
        <BotaoGrande tom="primario" tamanho="lg" onClick={t.tentarOutraForma} disabled={t.ocupado}>
          Tentar outra forma
        </BotaoGrande>
        <BotaoGrande
          tom="neutro"
          tamanho="lg"
          onClick={() => void t.cancelarCompra()}
          disabled={t.ocupado}
        >
          Cancelar compra
        </BotaoGrande>
      </div>
    </Centro>
  )
}

function TelaFalha({
  totem: t,
  etapa,
}: {
  totem: Totem
  etapa: Extract<Totem['etapa'], { tipo: 'falha' }>
}) {
  const segundos = useContagem(VOLTAR_AO_INICIO_S)
  return (
    <Centro>
      <span className="inline-flex h-32 w-32 items-center justify-center rounded-full bg-amber-50 text-[#B57407]">
        <TriangleAlert className="h-16 w-16" strokeWidth={1.5} />
      </span>
      <h2 className="mt-8 font-display text-[40px] font-bold leading-tight tracking-[-0.02em]">
        {etapa.titulo}
      </h2>
      <p className="mt-3 max-w-[560px] text-[19px] leading-relaxed text-muted">{etapa.motivo}</p>
      <p className="mt-2 text-[17px] text-ink">Se houve cobrança no cartão, ela foi estornada.</p>

      <BotaoGrande tom="primario" tamanho="lg" className="mt-12" onClick={t.reiniciar}>
        Voltar ao início
      </BotaoGrande>
      <p className="mt-4 text-body text-muted">Voltando sozinho em {segundos}s</p>
    </Centro>
  )
}

/* -------------------------------------------------------------------------- */
/* Peças                                                                      */
/* -------------------------------------------------------------------------- */

function Centro({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
      {children}
    </div>
  )
}

function Aviso({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-left text-[15px] text-danger',
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </div>
  )
}

type TomGrande = 'primario' | 'neutro' | 'sucesso' | 'perigo-suave'

const tonsGrandes: Record<TomGrande, string> = {
  primario: 'bg-teal text-white hover:bg-teal-dark',
  neutro: 'bg-surface text-ink border border-line hover:bg-surface-2',
  sucesso: 'bg-success text-white hover:brightness-95',
  'perigo-suave': 'bg-surface text-danger border border-danger/40 hover:bg-danger-50',
}

const tamanhosGrandes = {
  md: 'h-12 px-5 text-[16px] rounded-xl gap-2',
  lg: 'h-16 px-8 text-[19px] rounded-2xl gap-3',
  xl: 'h-[72px] px-8 text-[22px] rounded-2xl gap-3',
}

/** Botão do totem: alvo mínimo de 48px, sem depender de hover para ser legível. */
function BotaoGrande({
  tom,
  tamanho,
  icone,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tom: TomGrande
  tamanho: keyof typeof tamanhosGrandes
  icone?: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        tonsGrandes[tom],
        tamanhosGrandes[tamanho],
        className,
      )}
      {...props}
    >
      {icone}
      {children}
    </button>
  )
}

/** Conta de `segundos` até zero, uma vez por segundo. */
function useContagem(segundos: number): number {
  const [restante, setRestante] = useState(segundos)
  useEffect(() => {
    const id = window.setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])
  return restante
}
