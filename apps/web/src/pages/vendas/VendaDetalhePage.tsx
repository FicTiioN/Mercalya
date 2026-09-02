import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  Info,
  MessageCircle,
  Printer,
  Receipt,
  ShoppingBag,
  User,
  Zap,
} from 'lucide-react'
import type { EventoVenda } from '@/models'
import { ROTULOS_PAGAMENTO, VendaService } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, dataHora, hora, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton, SkeletonLinhas } from '@/components/ui/Feedback'
import { QuickAction } from '@/components/ui/Drawer'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'
import { VISUAL_PAGAMENTO } from './pagamento'

const iconesEvento: Record<EventoVenda['icone'], { icone: typeof Receipt; classe: string }> = {
  venda: { icone: ShoppingBag, classe: 'bg-teal-50 text-teal' },
  pagamento: { icone: CircleCheck, classe: 'bg-success-50 text-success' },
  comprovante: { icone: FileText, classe: 'bg-info-50 text-info' },
  cancelamento: { icone: CircleX, classe: 'bg-danger-50 text-danger' },
}

export function VendaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const toast = useToast()

  const venda = useRecurso(async () => (id ? VendaService.obter(id) : null), [id])
  const historico = useRecurso(
    async () => (id ? VendaService.historico(id) : []),
    [id],
  )

  if (venda.erro) {
    return (
      <PageContainer>
        <SectionCard>
          <EmptyState
            icone={<Receipt className="h-7 w-7" strokeWidth={1.5} />}
            titulo="Venda não encontrada"
            descricao="A venda que você procura não existe ou foi removida."
            acao={
              <Button variante="outline" onClick={() => navegar('/vendas')}>
                Voltar para vendas
              </Button>
            }
          />
        </SectionCard>
      </PageContainer>
    )
  }

  const v = venda.dados
  // O que de fato entrou: aprovado (ou aprovado e depois estornado). Recusado não conta.
  const recebido =
    v?.pagamentos
      .filter((p) => p.status === 'aprovado' || p.status === 'estornado')
      .reduce((acc, p) => acc + p.valor, 0) ?? 0

  return (
    <PageContainer>
      <PageHeader
        migalhas={[{ label: 'Vendas', to: '/vendas' }, { label: v ? `#${v.numero}` : 'Detalhe' }]}
        titulo={v ? `Venda #${v.numero}` : 'Venda'}
        acoes={
          <Button
            variante="outline"
            iconeEsquerda={<ArrowLeft className="h-4 w-4" strokeWidth={1.75} />}
            onClick={() => navegar('/vendas')}
          >
            Voltar
          </Button>
        }
      />

      {/* Status + linha de contexto, logo abaixo do título como na referência. */}
      {v && (
        <div className="-mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <StatusBadge status={v.status} ponto />
          <span className="flex items-center gap-2 text-body text-muted">
            <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {dataHora(v.data)}
          </span>
          <span className="flex items-center gap-2 text-body text-muted">
            <User className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Atendido por {v.operador}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.95fr)_minmax(0,1.3fr)]">
        {/* ----------------------------- Itens da venda ---------------------------- */}
        <SectionCard
          icone={<ShoppingBag className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Itens da venda"
          semPaddingCorpo
          className="lg:col-span-2 xl:col-span-1"
          rodape={
            v ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <span className="text-caption text-muted">
                  Total de itens: <span className="font-medium text-ink">{numero(v.totalItens)}</span>
                </span>
                <span className="text-caption text-muted">
                  Subtotal dos itens:{' '}
                  <span className="font-medium tabular text-ink">{moeda(v.subtotal)}</span>
                </span>
              </div>
            ) : undefined
          }
        >
          {venda.carregando || !v ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="mc-table-head">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="w-[62px] px-2 py-3 font-medium">Qtd.</th>
                    <th className="w-[94px] px-2 py-3 text-right font-medium">Preço unit.</th>
                    <th className="w-[98px] px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {v.itens.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <ProductAvatar imagem={item.imagem} nome={item.produtoNome} tamanho="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-body text-ink">{item.produtoNome}</p>
                            <p className="truncate text-caption tabular text-muted">{item.ean}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-body tabular text-muted">
                        {item.quantidade} un
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-body tabular text-muted">
                        {moeda(item.precoUnitario)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-body font-medium tabular text-ink">
                        {moeda(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ---------------------------- Resumo da venda ---------------------------- */}
        <SectionCard
          icone={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Resumo da venda"
          classeCorpo="pt-4"
        >
          {venda.carregando || !v ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : (
            <>
              <LinhaResumo rotulo="Subtotal dos itens" valor={moeda(v.subtotal)} />
              <LinhaResumo
                rotulo="Desconto"
                valor={`- ${moeda(v.desconto)}`}
                tom={v.desconto > 0 ? 'success' : undefined}
              />
              <LinhaResumo
                rotulo="Acréscimo"
                valor={`+ ${moeda(v.acrescimo)}`}
                tom={v.acrescimo > 0 ? 'amber' : undefined}
              />

              <div className="mt-4 border-t border-line pt-4">
                <p className="text-body text-muted">Total da venda</p>
                <p className="mt-1 font-display text-[30px] font-bold leading-9 tabular text-ink">
                  {moeda(v.total)}
                </p>
              </div>

              {v.pagamentos.some((p) => p.forma === 'dinheiro') && (
                <div className="mt-4 border-t border-dashed border-line pt-4">
                  <LinhaResumo rotulo="Pagamento recebido" valor={moeda(recebido)} />
                  <LinhaResumo rotulo="Troco" valor={moeda(v.troco)} tom="success" />
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* ------------------------ Pagamento + Informações ------------------------ */}
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            icone={<CreditCard className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Pagamento"
            semPaddingCorpo
          >
            {venda.carregando || !v ? (
              <div className="p-5">
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse">
                  <thead>
                    <tr className="mc-table-head">
                      <th className="px-5 py-3 font-medium">Forma</th>
                      <th className="whitespace-nowrap px-2 py-3 font-medium">Valor pago</th>
                      <th className="whitespace-nowrap px-2 py-3 font-medium">Status</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">Data/hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.pagamentos.map((p) => {
                      const visual = VISUAL_PAGAMENTO[p.forma]
                      const Icone = visual.icone
                      const quando = p.confirmadoEm ?? p.criadoEm
                      return (
                        <tr key={p.id} className="border-t border-line first:border-t-0">
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-2 whitespace-nowrap text-body text-ink">
                              <Icone
                                className={cn('h-4 w-4 shrink-0', visual.classe)}
                                strokeWidth={1.75}
                              />
                              {ROTULOS_PAGAMENTO[p.forma]}
                              {p.parcelas > 1 && (
                                <span className="text-caption text-muted">{p.parcelas}x</span>
                              )}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-3.5 text-body tabular text-ink">
                            {moeda(p.valor)}
                          </td>
                          <td className="px-2 py-3.5">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-caption tabular text-muted">
                            <span className="block">{formatarData(quando)}</span>
                            <span className="block">{hora(quando)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icone={<Info className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Informações da venda"
            classeCorpo="pt-4"
          >
            {venda.carregando || !v ? (
              <SkeletonLinhas linhas={4} />
            ) : (
              <dl>
                <LinhaInfo rotulo="Nº da venda" valor={`#${v.numero}`} />
                <LinhaInfo rotulo="Loja" valor={v.lojaNome} />
                <LinhaInfo rotulo="Tipo de venda" valor={v.tipoVenda} />
                <LinhaInfo rotulo="Canal" valor={v.canal} />
                <LinhaInfo rotulo="Cliente" valor={v.clienteNome} />
                <LinhaInfo rotulo="Observação" valor={v.observacao || '—'} />
              </dl>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ------------------------ Histórico + Ações rápidas ---------------------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard
          icone={<History className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Histórico da venda"
          classeCorpo="pt-5"
        >
          {historico.carregando ? (
            <SkeletonLinhas linhas={3} />
          ) : (
            <ol className="relative">
              {(historico.dados ?? []).map((evento, i, lista) => {
                const visual = iconesEvento[evento.icone]
                const Icone = visual.icone
                return (
                  <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < lista.length - 1 && (
                      <span
                        className="absolute left-[19px] top-10 h-[calc(100%-24px)] w-px bg-line"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        visual.classe,
                      )}
                      aria-hidden
                    >
                      <Icone className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-label font-semibold text-ink">{evento.titulo}</p>
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-caption tabular text-muted">
                          {dataHora(evento.quando)}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-muted">{evento.descricao}</p>
                      <p className="mt-1 text-caption text-muted">{evento.autor}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          icone={<Zap className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Ações rápidas"
          classeCorpo="space-y-2.5 pt-4"
        >
          <QuickAction
            icone={<Printer className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={() => toast.info('Comprovante', 'A impressão será habilitada com a API real.')}
          >
            Imprimir comprovante
          </QuickAction>
          <QuickAction
            icone={<MessageCircle className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={() =>
              toast.info('Envio por WhatsApp', 'Será conectado junto com a API real.')
            }
          >
            Enviar comprovante por WhatsApp
          </QuickAction>
          <QuickAction
            icone={<ClipboardList className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={() => navegar('/operacao/movimentacoes')}
          >
            Ver movimentações da venda
          </QuickAction>
        </SectionCard>
      </div>

      {/* ------------------------------- Rodapé --------------------------------- */}
      {v && (
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 border-t border-line pt-5 text-caption text-muted">
          <span>
            Registrado em: <span className="tabular text-ink">{dataHora(v.registradoEm)}</span>
          </span>
          <span>
            Última atualização:{' '}
            <span className="tabular text-ink">{dataHora(v.atualizadoEm)}</span>
          </span>
          <span className="ml-auto">
            ID interno: <span className="tabular text-ink">{v.idInterno}</span>
          </span>
        </div>
      )}
    </PageContainer>
  )
}

function LinhaResumo({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string
  valor: string
  tom?: 'success' | 'amber'
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-body text-muted">{rotulo}</span>
      <span
        className={cn(
          'text-body font-medium tabular',
          tom === 'success' && 'text-success',
          tom === 'amber' && 'text-[#D68A0F]',
          !tom && 'text-ink',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="shrink-0 text-caption text-muted">{rotulo}</dt>
      <dd className="min-w-0 truncate text-label text-ink">{valor}</dd>
    </div>
  )
}

