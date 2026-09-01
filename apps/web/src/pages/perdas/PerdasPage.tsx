import { useState } from 'react'
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Ellipsis,
  FileText,
  PackageX,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Tag,
  TrendingDown,
  TriangleAlert,
} from 'lucide-react'
import type { MotivoPerda } from '@/models'
import { EstoqueService, MOTIVOS, PerdaService, ProdutoService } from '@/services'
import type { PerdaListItem } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, dataHora, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardFooterLink, SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCard, SkeletonLinhas } from '@/components/ui/Feedback'
import {
  FormField,
  Input,
  SearchInput,
  Select,
  Textarea,
} from '@/components/ui/Form'
import { Chip, ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

function hojeISO(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

const tonsMotivo: Record<MotivoPerda, 'danger' | 'warning' | 'amber' | 'purple' | 'info' | 'neutro'> = {
  vencimento: 'danger',
  quebra: 'warning',
  avaria: 'amber',
  roubo: 'purple',
  'erro-operacional': 'info',
  outros: 'neutro',
}

export function PerdasPage() {
  const toast = useToast()

  const [produtoId, setProdutoId] = useState('')
  const [motivo, setMotivo] = useState<MotivoPerda | ''>('')
  const [quantidade, setQuantidade] = useState('')
  const [localId, setLocalId] = useState('')
  const [lote, setLote] = useState('')
  const [dataPerda, setDataPerda] = useState(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const [busca, setBusca] = useState('')
  const [filtroMotivo, setFiltroMotivo] = useState<MotivoPerda | 'todos'>('todos')
  const [filtroLocal, setFiltroLocal] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)

  const buscaDebounced = useDebounce(busca)

  const produtos = useRecurso(() => ProdutoService.listarSimples(), [])
  const locais = useRecurso(() => EstoqueService.locais(), [])
  const resumo = useRecurso(() => PerdaService.resumo(), [])
  const vencimentos = useRecurso(() => PerdaService.proximosVencimentos(5), [])
  const topPerdas = useRecurso(() => PerdaService.topPerdas(5), [])
  const lista = useRecurso(
    () =>
      PerdaService.listar({
        busca: buscaDebounced,
        motivo: filtroMotivo,
        localId: filtroLocal,
        pagina,
        porPagina,
      }),
    [buscaDebounced, filtroMotivo, filtroLocal, pagina, porPagina],
  )

  const produtoSelecionado = produtos.dados?.find((p) => p.id === produtoId)
  const saldoDisponivel =
    produtoSelecionado && localId
      ? localId === locais.dados?.find((l) => l.tipo === 'central')?.id
        ? produtoSelecionado.estoqueCentral
        : produtoSelecionado.estoqueLoja
      : null

  const limparFormulario = () => {
    setProdutoId('')
    setMotivo('')
    setQuantidade('')
    setLocalId('')
    setLote('')
    setDataPerda(hojeISO())
    setObservacao('')
    setErros({})
  }

  const registrar = async () => {
    const novos: Record<string, string> = {}
    if (!produtoId) novos.produtoId = 'Selecione o produto.'
    if (!motivo) novos.motivo = 'Selecione o motivo.'
    if (!localId) novos.localId = 'Selecione o local.'
    if (!quantidade || Number(quantidade) <= 0) novos.quantidade = 'Informe a quantidade.'
    setErros(novos)
    if (Object.keys(novos).length > 0) {
      toast.aviso('Revise o formulário', 'Preencha os campos obrigatórios.')
      return
    }

    setSalvando(true)
    try {
      const perda = await PerdaService.registrar({
        produtoId,
        motivo: motivo as MotivoPerda,
        quantidade: Number(quantidade),
        localId,
        loteId: null,
        data: dataPerda,
        observacao,
      })
      toast.sucesso(
        'Perda registrada',
        `${perda.quantidade} un de ${perda.produtoNome} · ${moeda(perda.valor)} baixados do estoque.`,
      )
      limparFormulario()
      lista.recarregar()
      resumo.recarregar()
      topPerdas.recarregar()
      vencimentos.recarregar()
      produtos.recarregar()
    } catch (e) {
      toast.erro('Não foi possível registrar a perda', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const colunas: Array<ColunaTabela<PerdaListItem>> = [
    {
      chave: 'data',
      cabecalho: 'Data',
      render: (p) => <span className="tabular text-muted">{dataHora(p.data)}</span>,
      largura: '150px',
    },
    {
      chave: 'produto',
      cabecalho: 'Produto',
      render: (p) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ProductAvatar imagem={p.produtoImagem} tamanho="sm" />
          <span className="truncate text-ink">{p.produtoNome}</span>
        </div>
      ),
    },
    {
      chave: 'motivo',
      cabecalho: 'Motivo',
      largura: '150px',
      render: (p) => (
        <Badge
          tom={
            tonsMotivo[p.motivo] === 'warning'
              ? 'warning'
              : tonsMotivo[p.motivo] === 'neutro'
                ? 'neutro'
                : tonsMotivo[p.motivo]
          }
        >
          {p.motivoLabel}
        </Badge>
      ),
    },
    {
      chave: 'local',
      cabecalho: 'Local',
      render: (p) => <span className="text-muted">{p.localNome}</span>,
      largura: '160px',
    },
    {
      chave: 'lote',
      cabecalho: 'Lote',
      render: (p) => <span className="tabular text-muted">{p.loteCodigo ?? '—'}</span>,
      largura: '120px',
    },
    {
      chave: 'quantidade',
      cabecalho: 'Quantidade',
      render: (p) => <span className="tabular">{numero(p.quantidade)} un</span>,
      largura: '110px',
    },
    {
      chave: 'valor',
      cabecalho: 'Valor (R$)',
      alinhamento: 'right',
      render: (p) => <span className="tabular font-medium text-danger">{moeda(p.valor)}</span>,
      largura: '120px',
    },
    {
      chave: 'registrado',
      cabecalho: 'Registrado por',
      render: (p) => <span className="text-muted">{p.registradoPor}</span>,
      largura: '150px',
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '70px',
      render: () => (
        <button
          type="button"
          aria-label="Mais ações"
          onClick={() => toast.info('Detalhes da perda', 'Consulte o registro em Movimentações.')}
          className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Ellipsis className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Perdas e ajustes"
        descricao="Registre e acompanhe perdas, quebras, vencimentos e ajustes de estoque."
        filtros={
          <div className="w-[240px]">
            <span className="mb-1.5 block text-label font-medium text-ink">Período</span>
            <div className="flex h-11 items-center justify-between rounded-md border border-line bg-surface px-3.5 text-body text-ink">
              <span className="tabular">
                {formatarData(hojeISO(-30))} — {formatarData(hojeISO())}
              </span>
              <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            </div>
            <p className="mt-1.5 text-caption text-muted">Comparado com: período anterior</p>
          </div>
        }
      />

      <MetricGrid>
        {resumo.carregando || !resumo.dados ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              rotulo="Perdas no mês"
              valor={`${numero(resumo.dados.perdasMes)} un`}
              icone={<TriangleAlert className="h-5 w-5" strokeWidth={1.75} />}
              tom="danger"
              delta={resumo.dados.perdasMesDelta}
              deltaInvertido
            />
            <MetricCard
              rotulo="Valor perdido"
              valor={moeda(resumo.dados.valorPerdido)}
              icone={<CircleDollarSign className="h-5 w-5" strokeWidth={1.75} />}
              tom="amber"
              delta={resumo.dados.valorPerdidoDelta}
              deltaInvertido
            />
            <MetricCard
              rotulo="Itens vencidos"
              valor={numero(resumo.dados.itensVencidos)}
              icone={<PackageX className="h-5 w-5" strokeWidth={1.75} />}
              tom="purple"
              delta={resumo.dados.itensVencidosDelta}
              deltaInvertido
            />
            <MetricCard
              rotulo="Ajustes registrados"
              valor={numero(resumo.dados.ajustesPendentes)}
              icone={<ClipboardList className="h-5 w-5" strokeWidth={1.75} />}
              tom="neutro"
              auxiliar="Movimentações de ajuste"
            />
          </>
        )}
      </MetricGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---------------------------- registrar perda ---------------------------- */}
          <SectionCard
            icone={<Tag className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Registrar perda"
            descricao="Preencha as informações para registrar uma nova perda de estoque."
            acoes={
              <Button
                variante="outline"
                tamanho="sm"
                iconeEsquerda={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />}
                onClick={limparFormulario}
              >
                Limpar formulário
              </Button>
            }
            classeCorpo="pt-5"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <FormField label="Produto" obrigatorio erro={erros.produtoId} htmlFor="perda-produto">
                <Select
                  id="perda-produto"
                  value={produtoId}
                  onChange={(e) => {
                    setProdutoId(e.target.value)
                    setErros((x) => ({ ...x, produtoId: '' }))
                  }}
                  placeholder="Buscar produto..."
                  erro={Boolean(erros.produtoId)}
                  opcoes={(produtos.dados ?? []).map((p) => ({ valor: p.id, label: p.nome }))}
                />
              </FormField>

              <FormField label="Motivo" obrigatorio erro={erros.motivo} htmlFor="perda-motivo">
                <Select
                  id="perda-motivo"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value as MotivoPerda)
                    setErros((x) => ({ ...x, motivo: '' }))
                  }}
                  placeholder="Selecione o motivo"
                  erro={Boolean(erros.motivo)}
                  opcoes={MOTIVOS.map((m) => ({ valor: m.valor, label: m.label }))}
                />
              </FormField>

              <FormField
                label="Quantidade"
                obrigatorio
                erro={erros.quantidade}
                helper={
                  saldoDisponivel !== null
                    ? `Disponível no local: ${numero(saldoDisponivel)} un`
                    : undefined
                }
                htmlFor="perda-qtd"
              >
                <Input
                  id="perda-qtd"
                  type="number"
                  min={0}
                  value={quantidade}
                  onChange={(e) => {
                    setQuantidade(e.target.value)
                    setErros((x) => ({ ...x, quantidade: '' }))
                  }}
                  placeholder="0"
                  erro={Boolean(erros.quantidade)}
                />
              </FormField>

              <FormField label="Local" obrigatorio erro={erros.localId} htmlFor="perda-local">
                <Select
                  id="perda-local"
                  value={localId}
                  onChange={(e) => {
                    setLocalId(e.target.value)
                    setErros((x) => ({ ...x, localId: '' }))
                  }}
                  placeholder="Selecione o local"
                  erro={Boolean(erros.localId)}
                  opcoes={(locais.dados ?? []).map((l) => ({ valor: l.id, label: l.nome }))}
                />
              </FormField>

              <FormField
                label="Lote"
                helper="Opcional — o sistema usa FEFO se não informado."
                htmlFor="perda-lote"
              >
                <Input
                  id="perda-lote"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Digite o lote (opcional)"
                />
              </FormField>

              <FormField label="Data da perda" obrigatorio htmlFor="perda-data">
                <Input
                  id="perda-data"
                  type="date"
                  value={dataPerda}
                  onChange={(e) => setDataPerda(e.target.value)}
                />
              </FormField>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Observação (opcional)" htmlFor="perda-obs">
                <Textarea
                  id="perda-obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Informe detalhes adicionais sobre a perda..."
                />
              </FormField>

              <div>
                <span className="mb-1.5 block text-label font-medium text-ink">
                  Motivos rápidos
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOTIVOS.map((m) => (
                    <Chip
                      key={m.valor}
                      tom={tonsMotivo[m.valor]}
                      ativo={motivo === m.valor}
                      onClick={() => {
                        setMotivo(m.valor)
                        setErros((x) => ({ ...x, motivo: '' }))
                      }}
                    >
                      {m.label}
                    </Chip>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    iconeEsquerda={<Save className="h-4 w-4" strokeWidth={1.75} />}
                    carregando={salvando}
                    onClick={() => void registrar()}
                  >
                    Registrar perda
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ---------------------------- histórico ---------------------------- */}
          <SectionCard
            icone={<FileText className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Histórico de perdas e ajustes"
            semPaddingCorpo
            rodape={
              lista.dados && lista.dados.total > 0 ? (
                <Pagination
                  className="border-t-0"
                  pagina={lista.dados.pagina}
                  totalPaginas={lista.dados.totalPaginas}
                  total={lista.dados.total}
                  porPagina={lista.dados.porPagina}
                  aoMudarPagina={setPagina}
                  aoMudarPorPagina={(n) => {
                    setPorPagina(n)
                    setPagina(1)
                  }}
                  rotuloItem="registros"
                />
              ) : undefined
            }
          >
            <div className="flex flex-wrap items-center gap-3 px-5 pb-4 pt-1">
              <SearchInput
                valor={busca}
                aoMudar={(v) => {
                  setBusca(v)
                  setPagina(1)
                }}
                placeholder="Buscar registro..."
                className="min-w-[200px] flex-1"
              />
              <Select
                className="h-11 w-[180px]"
                value={filtroMotivo}
                onChange={(e) => {
                  setFiltroMotivo(e.target.value as MotivoPerda | 'todos')
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos os motivos' },
                  ...MOTIVOS.map((m) => ({ valor: m.valor, label: m.label })),
                ]}
              />
              <Select
                className="h-11 w-[190px]"
                value={filtroLocal}
                onChange={(e) => {
                  setFiltroLocal(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos os locais' },
                  ...(locais.dados ?? []).map((l) => ({ valor: l.id, label: l.nome })),
                ]}
              />
              <Button
                variante="outline"
                iconeEsquerda={<SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />}
                onClick={() => {
                  setBusca('')
                  setFiltroMotivo('todos')
                  setFiltroLocal('todos')
                  setPagina(1)
                }}
              >
                Filtros
              </Button>
            </div>

            <DataTable
              colunas={colunas}
              itens={lista.dados?.itens ?? []}
              chaveDe={(p) => p.id}
              carregando={lista.carregando}
              densa
              vazio={
                <EmptyState
                  icone={<TriangleAlert className="h-7 w-7" strokeWidth={1.5} />}
                  titulo="Nenhuma perda registrada"
                  descricao="Registros de perdas, quebras e vencimentos aparecem aqui."
                />
              }
            />
          </SectionCard>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard
            icone={<CalendarClock className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Produtos próximos do vencimento"
            acoes={<span className="text-caption text-muted">Dias</span>}
            classeCorpo="pt-4"
            rodape={
              <CardFooterLink onClick={() => vencimentos.recarregar()}>
                Ver todos os próximos
                <ChevronRight className="h-4 w-4" />
              </CardFooterLink>
            }
          >
            {vencimentos.carregando ? (
              <SkeletonLinhas linhas={5} />
            ) : vencimentos.dados && vencimentos.dados.length > 0 ? (
              <ul className="-my-1.5">
                {vencimentos.dados.map((v) => (
                  <li
                    key={v.saldoId}
                    className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-0"
                  >
                    <ProductAvatar imagem={v.imagem} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label text-ink">{v.nome}</span>
                      <span className="block truncate text-caption tabular text-muted">
                        Lote {v.loteCodigo} | {formatarData(v.validade)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-label font-medium tabular',
                        v.dias <= 0 ? 'text-danger' : v.dias <= 15 ? 'text-[#D68A0F]' : 'text-muted',
                      )}
                    >
                      {v.dias <= 0 ? 'vencido' : `${v.dias} dias`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compacto
                icone={<CalendarClock className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Nenhum vencimento próximo"
                descricao="Nenhum lote com validade crítica no momento."
              />
            )}
          </SectionCard>

          <SectionCard
            icone={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Top perdas do mês"
            acoes={<span className="text-caption text-muted">Valor (R$)</span>}
            classeCorpo="pt-4"
            rodape={
              <CardFooterLink onClick={() => topPerdas.recarregar()}>
                Ver relatório completo
                <ChevronRight className="h-4 w-4" />
              </CardFooterLink>
            }
          >
            {topPerdas.carregando ? (
              <SkeletonLinhas linhas={5} />
            ) : topPerdas.dados && topPerdas.dados.length > 0 ? (
              <ol className="-my-1.5">
                {topPerdas.dados.map((p, i) => (
                  <li
                    key={p.produtoId}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-0"
                  >
                    <span className="w-4 shrink-0 text-caption tabular text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-label text-ink">{p.nome}</span>
                    <span className="shrink-0 text-label font-medium tabular text-ink">
                      {moeda(p.valor)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                compacto
                icone={<TrendingDown className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Nenhuma perda no período"
                descricao="Sua operação não registrou perdas recentemente."
              />
            )}
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  )
}
