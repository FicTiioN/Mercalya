import { useState } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Filter,
  Hash,
  History,
  MapPin,
  Printer,
  Repeat,
  TriangleAlert,
  User,
} from 'lucide-react'
import type { TipoMovimentacao } from '@/models'
import { EstoqueService, MovimentacaoService, ProdutoService } from '@/services'
import type { MovimentacaoListItem } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, dataHora, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCard, SkeletonLinhas } from '@/components/ui/Feedback'
import { FilterBar, FilterField, Input, SearchInput, Select } from '@/components/ui/Form'
import { Drawer, DrawerLinha, DrawerSection } from '@/components/ui/Drawer'
import { Avatar, ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

function hojeISO(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

export function MovimentacoesPage() {
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<TipoMovimentacao | 'todos'>('todos')
  const [produtoId, setProdutoId] = useState('todos')
  const [usuario, setUsuario] = useState('todos')
  const [origemId, setOrigemId] = useState('todas')
  const [destinoId, setDestinoId] = useState('todos')
  const [de, setDe] = useState(hojeISO(-60))
  const [ate, setAte] = useState(hojeISO())
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)

  const buscaDebounced = useDebounce(busca)

  const produtos = useRecurso(() => ProdutoService.listarSimples(), [])
  const locais = useRecurso(() => EstoqueService.locais(), [])
  const usuarios = useRecurso(() => MovimentacaoService.usuarios(), [])
  const resumo = useRecurso(() => MovimentacaoService.resumo(), [])
  const lista = useRecurso(
    () =>
      MovimentacaoService.listar({
        busca: buscaDebounced,
        tipo,
        produtoId,
        usuario,
        origemId,
        destinoId,
        de,
        ate,
        pagina,
        porPagina,
      }),
    [buscaDebounced, tipo, produtoId, usuario, origemId, destinoId, de, ate, pagina, porPagina],
  )

  const selecionada = lista.dados?.itens.find((m) => m.id === selecionadaId) ?? null

  const limparFiltros = () => {
    setBusca('')
    setTipo('todos')
    setProdutoId('todos')
    setUsuario('todos')
    setOrigemId('todas')
    setDestinoId('todos')
    setDe(hojeISO(-60))
    setAte(hojeISO())
    setPagina(1)
  }

  const colunas: Array<ColunaTabela<MovimentacaoListItem>> = [
    {
      chave: 'data',
      cabecalho: 'Data / Hora',
      render: (m) => <span className="tabular text-muted">{dataHora(m.data)}</span>,
      largura: '150px',
    },
    {
      chave: 'tipo',
      cabecalho: 'Tipo',
      render: (m) => <StatusBadge status={m.tipo} />,
      largura: '132px',
    },
    {
      chave: 'produto',
      cabecalho: 'Produto',
      render: (m) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ProductAvatar imagem={m.produtoImagem} tamanho="sm" />
          <span className="truncate text-ink">{m.produtoNome}</span>
        </div>
      ),
    },
    {
      chave: 'origem',
      cabecalho: 'Origem',
      render: (m) => <span className="text-muted">{m.origemLabel}</span>,
      largura: '150px',
    },
    {
      chave: 'destino',
      cabecalho: 'Destino',
      render: (m) => <span className="text-muted">{m.destinoLabel}</span>,
      largura: '170px',
    },
    {
      chave: 'quantidade',
      cabecalho: 'Quantidade',
      render: (m) => (
        <span
          className={cn(
            'tabular font-medium',
            m.quantidade > 0 ? 'text-success' : 'text-danger',
          )}
        >
          {m.quantidade > 0 ? '+' : ''}
          {numero(m.quantidade)} un
        </span>
      ),
      largura: '120px',
    },
    {
      chave: 'usuario',
      cabecalho: 'Usuário',
      render: (m) => <span className="text-muted">{m.usuario}</span>,
      largura: '130px',
    },
    {
      chave: 'observacao',
      cabecalho: 'Observação',
      render: (m) => <span className="truncate text-muted">{m.observacao || '—'}</span>,
      largura: '170px',
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      render: (m) => <StatusBadge status={m.status} />,
      largura: '116px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Movimentações"
        descricao="Acompanhe todas as entradas, saídas, transferências e ajustes do seu estoque."
      />

      <div className="flex min-w-0 gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <FilterBar
            acoes={
              <>
                <Button variante="ghost" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
                <Button
                  iconeEsquerda={<Filter className="h-4 w-4" strokeWidth={1.75} />}
                  onClick={() => lista.recarregar()}
                >
                  Filtrar
                </Button>
              </>
            }
          >
            <FilterField label="Período" className="min-w-[260px] flex-none">
              <div className="flex items-center gap-2">
                <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
                <span className="text-muted">–</span>
                <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
              </div>
            </FilterField>

            <FilterField label="Tipo de movimentação" className="min-w-[190px] flex-none">
              <Select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as TipoMovimentacao | 'todos')
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  { valor: 'ENTRADA', label: 'Entrada' },
                  { valor: 'TRANSFERENCIA', label: 'Transferência' },
                  { valor: 'VENDA', label: 'Venda' },
                  { valor: 'PERDA', label: 'Perda' },
                  { valor: 'AJUSTE', label: 'Ajuste' },
                  { valor: 'DEVOLUCAO', label: 'Devolução' },
                ]}
              />
            </FilterField>

            <FilterField label="Produto" className="min-w-[200px] flex-1">
              <SearchInput
                valor={busca}
                aoMudar={(v) => {
                  setBusca(v)
                  setPagina(1)
                }}
                placeholder="Buscar produto..."
              />
            </FilterField>

            <FilterField label="Usuário" className="min-w-[160px] flex-none">
              <Select
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  ...(usuarios.dados ?? []).map((u) => ({ valor: u, label: u })),
                ]}
              />
            </FilterField>

            <FilterField label="Origem" className="min-w-[170px] flex-none">
              <Select
                value={origemId}
                onChange={(e) => {
                  setOrigemId(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todas', label: 'Todas' },
                  ...(locais.dados ?? []).map((l) => ({ valor: l.id, label: l.nome })),
                ]}
              />
            </FilterField>

            <FilterField label="Destino" className="min-w-[170px] flex-none">
              <Select
                value={destinoId}
                onChange={(e) => {
                  setDestinoId(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  ...(locais.dados ?? []).map((l) => ({ valor: l.id, label: l.nome })),
                ]}
              />
            </FilterField>

            <FilterField label="Produto específico" className="min-w-[200px] flex-none">
              <Select
                value={produtoId}
                onChange={(e) => {
                  setProdutoId(e.target.value)
                  setPagina(1)
                }}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  ...(produtos.dados ?? []).map((p) => ({ valor: p.id, label: p.nome })),
                ]}
              />
            </FilterField>
          </FilterBar>

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
                  rotulo="Entradas do período"
                  valor={numero(resumo.dados.entradasDia)}
                  icone={<ArrowRight className="h-5 w-5" strokeWidth={1.75} />}
                  tom="success"
                  delta={resumo.dados.entradasDelta}
                  deltaSufixo={`· ${numero(resumo.dados.entradasItens)} itens`}
                />
                <MetricCard
                  rotulo="Transferências"
                  valor={numero(resumo.dados.transferencias)}
                  icone={<ArrowLeftRight className="h-5 w-5" strokeWidth={1.75} />}
                  tom="info"
                  delta={resumo.dados.transferenciasDelta}
                  deltaSufixo={`· ${numero(resumo.dados.transferenciasItens)} itens`}
                />
                <MetricCard
                  rotulo="Ajustes"
                  valor={numero(resumo.dados.ajustes)}
                  icone={<Repeat className="h-5 w-5" strokeWidth={1.75} />}
                  tom="amber"
                  delta={resumo.dados.ajustesDelta}
                  deltaSufixo={`· ${numero(resumo.dados.ajustesItens)} itens`}
                />
                <MetricCard
                  rotulo="Perdas registradas"
                  valor={numero(resumo.dados.perdas)}
                  icone={<TriangleAlert className="h-5 w-5" strokeWidth={1.75} />}
                  tom="danger"
                  delta={resumo.dados.perdasDelta}
                  deltaInvertido
                  deltaSufixo={`· ${numero(resumo.dados.perdasItens)} itens`}
                />
              </>
            )}
          </MetricGrid>

          <SectionCard
            titulo="Histórico de movimentações"
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
                  rotuloItem="movimentações"
                />
              ) : undefined
            }
          >
            <DataTable
              colunas={colunas}
              itens={lista.dados?.itens ?? []}
              chaveDe={(m) => m.id}
              carregando={lista.carregando}
              aoClicarLinha={(m) => setSelecionadaId(m.id)}
              linhaSelecionada={(m) => m.id === selecionadaId}
              vazio={
                <EmptyState
                  icone={<History className="h-7 w-7" strokeWidth={1.5} />}
                  titulo="Nenhuma movimentação encontrada"
                  descricao="Ajuste o período ou os filtros. As movimentações são geradas por compras, abastecimentos, perdas e ajustes."
                  acao={
                    <Button variante="outline" onClick={limparFiltros}>
                      Limpar filtros
                    </Button>
                  }
                />
              }
            />
          </SectionCard>
        </div>

        {selecionada && (
          <DrawerMovimentacao
            movimentacao={selecionada}
            aoFechar={() => setSelecionadaId(null)}
            aoImprimir={() =>
              toast.info('Comprovante', 'A impressão será habilitada com a API real.')
            }
          />
        )}
      </div>
    </PageContainer>
  )
}

function DrawerMovimentacao({
  movimentacao,
  aoFechar,
  aoImprimir,
}: {
  movimentacao: MovimentacaoListItem
  aoFechar: () => void
  aoImprimir: () => void
}) {
  const historico = useRecurso(
    () => MovimentacaoService.historico(movimentacao.id),
    [movimentacao.id],
  )

  return (
    <Drawer
      aberto
      aoFechar={aoFechar}
      titulo="Detalhes da movimentação"
      className="self-start xl:sticky xl:top-[100px]"
      rodape={
        <Button
          blocoCompleto
          variante="outline"
          iconeEsquerda={<Printer className="h-4 w-4" strokeWidth={1.75} />}
          onClick={aoImprimir}
        >
          Imprimir comprovante
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-2 pb-3">
        <StatusBadge status={movimentacao.tipo} />
        <span className="text-caption tabular text-muted">ID: #{movimentacao.id}</span>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-line p-3">
        <ProductAvatar imagem={movimentacao.produtoImagem} tamanho="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-card-title font-semibold text-ink">
            {movimentacao.produtoNome}
          </p>
          {movimentacao.marcaNome && (
            <p className="truncate text-caption text-muted">{movimentacao.marcaNome}</p>
          )}
          <p className="truncate text-caption tabular text-muted">SKU: {movimentacao.produtoSku}</p>
        </div>
      </div>

      <DrawerSection>
        <DrawerLinha
          icone={<CalendarClock className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Data / Hora"
          valor={dataHora(movimentacao.data)}
        />
        <DrawerLinha
          icone={<Hash className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Quantidade"
          valor={`${Math.abs(movimentacao.quantidade)} unidades`}
        />
        <DrawerLinha
          icone={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Origem"
          valor={movimentacao.origemLabel}
        />
        <DrawerLinha
          icone={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Destino"
          valor={movimentacao.destinoLabel}
        />
        <DrawerLinha
          icone={<User className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Usuário"
          valor={
            <span className="flex items-center gap-2">
              <Avatar
                iniciais={movimentacao.usuario
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
                tamanho="xs"
              />
              {movimentacao.usuario}
            </span>
          }
        />
        <DrawerLinha
          icone={<History className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Observação"
          valor={movimentacao.observacao || '—'}
        />
      </DrawerSection>

      <DrawerSection titulo="Informações adicionais">
        <dl className="space-y-0">
          <LinhaInfo rotulo="Documento fiscal" valor={movimentacao.documento || '—'} />
          <LinhaInfo
            rotulo="Valor total"
            valor={movimentacao.valorTotal !== null ? moeda(movimentacao.valorTotal) : '—'}
          />
          <LinhaInfo
            rotulo="Custo unitário"
            valor={movimentacao.custoUnitario !== null ? moeda(movimentacao.custoUnitario) : '—'}
          />
          <LinhaInfo rotulo="Lote" valor={movimentacao.loteCodigo ?? '—'} />
          <LinhaInfo
            rotulo="Validade"
            valor={movimentacao.loteValidade ? formatarData(movimentacao.loteValidade) : '—'}
          />
        </dl>
      </DrawerSection>

      <DrawerSection titulo="Histórico do movimento" className="pb-2">
        {historico.carregando ? (
          <SkeletonLinhas linhas={3} />
        ) : (
          <ol className="space-y-4">
            {(historico.dados ?? []).map((evento, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success">
                  <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-label font-medium text-ink">{evento.titulo}</p>
                    <span className="shrink-0 text-caption tabular text-muted">
                      {dataHora(evento.quando)}
                    </span>
                  </div>
                  <p className="text-caption text-muted">por {evento.autor}</p>
                  <p className="text-caption text-muted">{evento.descricao}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DrawerSection>
    </Drawer>
  )
}

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-caption text-muted">{rotulo}</dt>
      <dd className="text-label font-medium tabular text-ink">{valor}</dd>
    </div>
  )
}
