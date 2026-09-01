import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  ChevronRight,
  Clock,
  Download,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Wallet,
} from 'lucide-react'
import type { LoteEstoqueItem } from '@/models'
import { EstoqueService, ProdutoService } from '@/services'
import type { ConsultaEstoque } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardFooterLink, SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCard, SkeletonLinhas } from '@/components/ui/Feedback'
import { FilterBar, FilterField, FormField, Input, SearchInput, Select, Toggle } from '@/components/ui/Form'
import { Dialog } from '@/components/ui/Dialog'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

export function EstoqueCentralPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState('todas')
  const [status, setStatus] = useState<ConsultaEstoque['status']>('todos')
  const [validade, setValidade] = useState<ConsultaEstoque['validade']>('todos')
  const [localId, setLocalId] = useState('todos')
  const [apenasReserva, setApenasReserva] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [ajustando, setAjustando] = useState<LoteEstoqueItem | null>(null)

  const buscaDebounced = useDebounce(busca)

  const categorias = useRecurso(() => ProdutoService.categorias(), [])
  const locais = useRecurso(() => EstoqueService.locais(), [])
  const resumo = useRecurso(() => EstoqueService.resumo(), [])
  const sugestoes = useRecurso(() => EstoqueService.sugestoes(), [])
  const resumoSugestoes = useRecurso(() => EstoqueService.resumoSugestoes(), [])
  const lista = useRecurso(
    () =>
      EstoqueService.listarLotes({
        busca: buscaDebounced,
        categoriaId,
        status,
        validade,
        localId,
        apenasComReserva: apenasReserva,
        pagina,
        porPagina,
      }),
    [buscaDebounced, categoriaId, status, validade, localId, apenasReserva, pagina, porPagina],
  )

  const temFiltro =
    Boolean(buscaDebounced) ||
    categoriaId !== 'todas' ||
    status !== 'todos' ||
    validade !== 'todos' ||
    localId !== 'todos' ||
    apenasReserva

  const limparFiltros = () => {
    setBusca('')
    setCategoriaId('todas')
    setStatus('todos')
    setValidade('todos')
    setLocalId('todos')
    setApenasReserva(false)
    setPagina(1)
  }

  const recarregarTudo = () => {
    lista.recarregar()
    resumo.recarregar()
    sugestoes.recarregar()
    resumoSugestoes.recarregar()
  }

  const colunas: Array<ColunaTabela<LoteEstoqueItem>> = [
    {
      chave: 'produto',
      cabecalho: 'Produto',
      render: (i) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductAvatar imagem={i.produtoImagem} nome={i.produtoNome} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{i.produtoNome}</p>
            <p className="truncate text-caption tabular text-muted">{i.ean}</p>
          </div>
        </div>
      ),
    },
    {
      chave: 'lote',
      cabecalho: 'Lote',
      render: (i) => <span className="tabular text-muted">{i.loteCodigo}</span>,
      largura: '120px',
    },
    {
      chave: 'validade',
      cabecalho: 'Validade',
      largura: '130px',
      render: (i) => (
        <div>
          <p className="tabular text-ink">{i.validade ? formatarData(i.validade) : '—'}</p>
          {i.diasParaVencer !== null && (
            <p
              className={cn(
                'text-caption tabular',
                i.diasParaVencer <= 0
                  ? 'text-danger'
                  : i.diasParaVencer <= 30
                    ? 'text-[#D68A0F]'
                    : 'text-muted',
              )}
            >
              {i.diasParaVencer <= 0 ? 'vencido' : `${i.diasParaVencer} dias`}
            </p>
          )}
        </div>
      ),
    },
    {
      chave: 'quantidade',
      cabecalho: 'Qtd. disponível',
      render: (i) => <span className="tabular font-medium">{numero(i.disponivel)} un</span>,
      largura: '130px',
    },
    {
      chave: 'reserva',
      cabecalho: 'Reserva',
      render: (i) => <span className="tabular text-muted">{numero(i.reservado)} un</span>,
      largura: '88px',
    },
    {
      chave: 'custo',
      cabecalho: 'Custo médio',
      render: (i) => <span className="tabular text-muted">{moeda(i.custoMedio)}</span>,
      largura: '104px',
    },
    {
      chave: 'local',
      cabecalho: 'Local',
      largura: '148px',
      render: (i) => (
        <div className="min-w-0">
          <p className="truncate text-ink">{i.localNome}</p>
          <p className="truncate text-caption text-muted">{i.posicao}</p>
        </div>
      ),
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      render: (i) => <StatusBadge status={i.status} />,
      largura: '108px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Estoque central"
        descricao="Gerencie o estoque da central, acompanhe disponibilidade, validade e movimentações."
      />

      <div className="flex flex-wrap gap-3">
        <Button
          variante="outline"
          iconeEsquerda={<ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />}
          onClick={() => navegar('/operacao/abastecimento')}
        >
          Transferir para loja
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="flex min-w-0 flex-col gap-6">
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
                  rotulo="Total de itens"
                  valor={numero(resumo.dados.totalItens)}
                  icone={<Boxes className="h-5 w-5" strokeWidth={1.75} />}
                  tom="teal"
                  delta={resumo.dados.totalItensDelta}
                />
                <MetricCard
                  rotulo="Valor em estoque"
                  valor={moeda(resumo.dados.valorEstoque)}
                  icone={<Wallet className="h-5 w-5" strokeWidth={1.75} />}
                  tom="info"
                  delta={resumo.dados.valorEstoqueDelta}
                />
                <MetricCard
                  rotulo="Próximos a vencer"
                  valor={`${numero(resumo.dados.proximosVencer)} itens`}
                  icone={<Clock className="h-5 w-5" strokeWidth={1.75} />}
                  tom="amber"
                  delta={resumo.dados.proximosVencerDelta}
                  deltaInvertido
                />
                <MetricCard
                  rotulo="Reposição para loja"
                  valor={moeda(resumo.dados.reposicaoLoja)}
                  icone={<Store className="h-5 w-5" strokeWidth={1.75} />}
                  tom="purple"
                  delta={resumo.dados.reposicaoLojaDelta}
                />
              </>
            )}
          </MetricGrid>

          <FilterBar
            acoes={
              <Button
                variante="outline"
                iconeEsquerda={<SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />}
                onClick={limparFiltros}
                disabled={!temFiltro}
              >
                Limpar filtros
              </Button>
            }
          >
            <FilterField label="Buscar" className="min-w-[240px] flex-[1.3]">
              <SearchInput
                valor={busca}
                aoMudar={(v) => {
                  setBusca(v)
                  setPagina(1)
                }}
                placeholder="Buscar produto, código ou lote..."
              />
            </FilterField>

            <FilterField label="Categoria" className="min-w-[160px] flex-none">
              <Select
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todas', label: 'Todas' },
                  ...(categorias.dados ?? []).map((c) => ({ valor: c.id, label: c.nome })),
                ]}
              />
            </FilterField>

            <FilterField label="Status" className="min-w-[150px] flex-none">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ConsultaEstoque['status'])
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  { valor: 'disponivel', label: 'Disponível' },
                  { valor: 'atencao', label: 'Atenção' },
                  { valor: 'critico', label: 'Crítico' },
                ]}
              />
            </FilterField>

            <FilterField label="Validade" className="min-w-[150px] flex-none">
              <Select
                value={validade}
                onChange={(e) => {
                  setValidade(e.target.value as ConsultaEstoque['validade'])
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  { valor: '7', label: 'Vence em 7 dias' },
                  { valor: '15', label: 'Vence em 15 dias' },
                  { valor: '30', label: 'Vence em 30 dias' },
                  { valor: 'vencidos', label: 'Vencidos' },
                ]}
              />
            </FilterField>

            <FilterField label="Local" className="min-w-[170px] flex-none">
              <Select
                value={localId}
                onChange={(e) => {
                  setLocalId(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  ...(locais.dados ?? []).map((l) => ({ valor: l.id, label: l.nome })),
                ]}
              />
            </FilterField>

            <div className="flex h-11 items-center">
              <Toggle
                ativo={apenasReserva}
                aoMudar={(v) => {
                  setApenasReserva(v)
                  setPagina(1)
                }}
                label="Exibir apenas itens com reserva"
              />
            </div>
          </FilterBar>

          <SectionCard
            titulo="Itens em estoque"
            acoes={
              <Button
                variante="outline"
                tamanho="sm"
                iconeEsquerda={<Download className="h-4 w-4" strokeWidth={1.75} />}
                onClick={() =>
                  toast.info('Exportação', 'A exportação será habilitada com a API real.')
                }
              >
                Exportar
              </Button>
            }
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
                  rotuloItem="itens"
                />
              ) : undefined
            }
          >
            <DataTable
              colunas={colunas}
              itens={lista.dados?.itens ?? []}
              chaveDe={(i) => i.saldoId}
              carregando={lista.carregando}
              aoClicarLinha={(i) => setAjustando(i)}
              vazio={
                <EmptyState
                  icone={<Boxes className="h-7 w-7" strokeWidth={1.5} />}
                  titulo={temFiltro ? 'Nenhum item encontrado' : 'Estoque central vazio'}
                  descricao={
                    temFiltro
                      ? 'Nenhum lote corresponde aos filtros aplicados.'
                      : 'Registre uma compra para dar entrada de produtos no estoque central.'
                  }
                  acao={
                    temFiltro ? (
                      <Button variante="outline" onClick={limparFiltros}>
                        Limpar filtros
                      </Button>
                    ) : (
                      <Button
                        iconeEsquerda={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
                        onClick={() => navegar('/operacao/compras/nova')}
                      >
                        Nova compra
                      </Button>
                    )
                  }
                />
              }
            />
          </SectionCard>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard
            titulo="Sugestões de abastecimento"
            descricao="Produtos que precisam ser enviados para a loja."
            classeCorpo="space-y-2.5 pt-4"
            rodape={
              <CardFooterLink onClick={() => navegar('/operacao/abastecimento')}>
                Ver todas as sugestões
                <ChevronRight className="h-4 w-4" />
              </CardFooterLink>
            }
          >
            {sugestoes.carregando ? (
              <SkeletonLinhas linhas={4} />
            ) : sugestoes.dados && sugestoes.dados.length > 0 ? (
              sugestoes.dados.slice(0, 5).map((s) => (
                <div
                  key={s.produtoId}
                  className="rounded-md border border-line p-3 transition-colors hover:border-teal-100 hover:bg-teal-50/40"
                >
                  <div className="flex items-start gap-2.5">
                    <ProductAvatar imagem={s.produtoImagem} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label font-medium text-ink">{s.produtoNome}</p>
                      <p className="truncate text-caption text-muted">{s.motivo}</p>
                    </div>
                  </div>
                  <p className="mt-2 font-display text-card-title font-semibold tabular text-ink">
                    {numero(s.quantidadeSugerida)} un
                  </p>
                  <p className="text-caption text-muted">
                    Disponível na central: {numero(s.disponivelCentral)} un
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                compacto
                icone={<Store className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Loja abastecida"
                descricao="Nenhuma reposição sugerida no momento."
              />
            )}
          </SectionCard>

          <SectionCard titulo="Resumo das sugestões" classeCorpo="pt-4">
            {resumoSugestoes.dados && (
              <>
                <LinhaResumo
                  rotulo="Total de itens"
                  valor={`${numero(resumoSugestoes.dados.totalItens)} un`}
                />
                <LinhaResumo
                  rotulo="Valor estimado"
                  valor={moeda(resumoSugestoes.dados.valorEstimado)}
                />
                <LinhaResumo
                  rotulo="Produtos sugeridos"
                  valor={numero(resumoSugestoes.dados.produtos)}
                />
                <Button
                  className="mt-4"
                  blocoCompleto
                  variante="outline"
                  iconeEsquerda={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
                  onClick={() => navegar('/operacao/abastecimento')}
                >
                  Gerar plano de abastecimento
                </Button>
              </>
            )}
          </SectionCard>
        </aside>
      </div>

      <DialogAjuste
        item={ajustando}
        aoFechar={() => setAjustando(null)}
        aoConcluir={() => {
          setAjustando(null)
          recarregarTudo()
        }}
      />
    </PageContainer>
  )
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="text-caption text-muted">{rotulo}</span>
      <span className="text-label font-medium tabular text-ink">{valor}</span>
    </div>
  )
}

function DialogAjuste({
  item,
  aoFechar,
  aoConcluir,
}: {
  item: LoteEstoqueItem | null
  aoFechar: () => void
  aoConcluir: () => void
}) {
  const toast = useToast()
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('Ajuste de contagem')
  const [salvando, setSalvando] = useState(false)

  const aberto = item !== null
  const quantidadeAtual = item?.quantidade ?? 0

  const confirmar = async () => {
    if (!item) return
    setSalvando(true)
    try {
      const resultado = await EstoqueService.ajustar({
        saldoId: item.saldoId,
        novaQuantidade: Number(quantidade),
        motivo,
      })
      toast.sucesso(
        'Estoque ajustado',
        `${item.produtoNome}: ${resultado.delta > 0 ? '+' : ''}${resultado.delta} un.`,
      )
      setQuantidade('')
      aoConcluir()
    } catch (e) {
      toast.erro('Não foi possível ajustar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Ajustar estoque"
      descricao={item ? `${item.produtoNome} · lote ${item.loteCodigo}` : undefined}
      larguraMaxima="max-w-md"
      rodape={
        <>
          <Button variante="ghost" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirmar()}
            carregando={salvando}
            disabled={quantidade === ''}
          >
            Confirmar ajuste
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-md border border-line bg-surface-2/50 px-4 py-3">
          <p className="text-caption text-muted">Quantidade atual</p>
          <p className="mt-0.5 font-display text-section-title font-semibold tabular text-ink">
            {numero(quantidadeAtual)} un
          </p>
        </div>

        <FormField
          label="Nova quantidade"
          obrigatorio
          helper="A diferença será registrada como movimentação de AJUSTE."
          htmlFor="nova-qtd"
        >
          <Input
            id="nova-qtd"
            type="number"
            min={0}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder={String(quantidadeAtual)}
            autoFocus
          />
        </FormField>

        <FormField label="Motivo do ajuste" htmlFor="motivo-ajuste">
          <Select
            id="motivo-ajuste"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            opcoes={[
              { valor: 'Ajuste de contagem', label: 'Ajuste de contagem' },
              { valor: 'Ajuste de inventário', label: 'Ajuste de inventário' },
              { valor: 'Ajuste de sistema', label: 'Ajuste de sistema' },
              { valor: 'Correção de entrada', label: 'Correção de entrada' },
            ]}
          />
        </FormField>
      </div>
    </Dialog>
  )
}
