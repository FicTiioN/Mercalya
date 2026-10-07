import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CircleDollarSign,
  CircleX,
  Eye,
  Package,
  Printer,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react'
import type { FormaPagamentoVenda, StatusVenda, VendaListItem } from '@/models'
import { ROTULOS_PAGAMENTO, VendaService } from '@/services'
import { pagamentoPrincipal, VISUAL_PAGAMENTO } from './pagamento'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { dataHora, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback'
import { FilterBar, FilterField, SearchInput, Select } from '@/components/ui/Form'
import { useToast } from '@/components/ui/toast-context'

function hojeISO(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

export function VendasPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [de, setDe] = useState(hojeISO(-30))
  const [ate, setAte] = useState(hojeISO())
  const [lojaId, setLojaId] = useState('todas')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoVenda | 'todas'>('todas')
  const [status, setStatus] = useState<StatusVenda | 'todos'>('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const buscaDebounced = useDebounce(busca)
  const filtros = { busca: buscaDebounced, de, ate, lojaId, formaPagamento, status }

  const lojas = useRecurso(() => VendaService.lojas(), [])
  const resumo = useRecurso(
    () => VendaService.resumo(filtros),
    [buscaDebounced, de, ate, lojaId, formaPagamento, status],
  )
  const lista = useRecurso(
    () => VendaService.listar({ ...filtros, pagina, porPagina }),
    [buscaDebounced, de, ate, lojaId, formaPagamento, status, pagina, porPagina],
  )

  const temFiltro =
    Boolean(buscaDebounced) ||
    lojaId !== 'todas' ||
    formaPagamento !== 'todas' ||
    status !== 'todos' ||
    de !== hojeISO(-30) ||
    ate !== hojeISO()

  const limparFiltros = () => {
    setBusca('')
    setDe(hojeISO(-30))
    setAte(hojeISO())
    setLojaId('todas')
    setFormaPagamento('todas')
    setStatus('todos')
    setPagina(1)
  }

  const colunas: Array<ColunaTabela<VendaListItem>> = [
    {
      chave: 'numero',
      cabecalho: 'Nº da venda',
      largura: '124px',
      render: (v) => (
        <span className="whitespace-nowrap font-medium tabular text-ink">#{v.numero}</span>
      ),
    },
    {
      chave: 'data',
      cabecalho: 'Data e hora',
      largura: '152px',
      render: (v) => (
        <span className="whitespace-nowrap tabular text-muted">{dataHora(v.data)}</span>
      ),
    },
    {
      chave: 'cliente',
      cabecalho: 'Cliente',
      render: (v) => <span className="truncate text-ink">{v.clienteNome}</span>,
    },
    {
      chave: 'operador',
      cabecalho: 'Operador',
      largura: '124px',
      render: (v) => <span className="truncate text-muted">{v.operador}</span>,
    },
    {
      chave: 'itens',
      cabecalho: 'Itens',
      largura: '70px',
      render: (v) => <span className="tabular text-muted">{numero(v.totalItens)}</span>,
    },
    {
      chave: 'total',
      cabecalho: 'Total',
      largura: '112px',
      render: (v) => <span className="tabular font-medium text-ink">{moeda(v.total)}</span>,
    },
    {
      chave: 'pagamento',
      cabecalho: 'Forma de pagamento',
      largura: '172px',
      render: (v) => {
        const principal = pagamentoPrincipal(v)
        if (!principal) return <span className="text-muted">—</span>
        const visual = VISUAL_PAGAMENTO[principal.forma]
        const Icone = visual.icone
        const outros = v.pagamentos.length - 1
        return (
          <span className="flex items-center gap-2 whitespace-nowrap text-ink">
            <Icone className={cn('h-4 w-4 shrink-0', visual.classe)} strokeWidth={1.75} />
            {ROTULOS_PAGAMENTO[principal.forma]}
            {outros > 0 && <span className="text-caption text-muted">+{outros}</span>}
          </span>
        )
      },
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      largura: '122px',
      render: (v) => <StatusBadge status={v.status} ponto />,
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '102px',
      render: (v) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label={`Ver detalhes da venda ${v.numero}`}
            onClick={(e) => {
              e.stopPropagation()
              navegar(`/vendas/${v.id}`)
            }}
            className="rounded-md border border-line p-2 text-muted transition-colors hover:border-teal-100 hover:bg-teal-50 hover:text-teal"
          >
            <Eye className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Imprimir comprovante da venda ${v.numero}`}
            onClick={(e) => {
              e.stopPropagation()
              toast.info('Comprovante', 'A impressão será habilitada com a API real.')
            }}
            className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Printer className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Vendas"
        descricao="Consulte e acompanhe todas as vendas realizadas na sua loja."
      />

      <MetricGrid colunas={5}>
        {resumo.carregando || !resumo.dados ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              rotulo="Total de vendas"
              valor={numero(resumo.dados.totalVendas)}
              icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
              tom="teal"
              delta={resumo.dados.totalVendasDelta}
            />
            <MetricCard
              rotulo="Faturamento bruto"
              valor={moeda(resumo.dados.faturamentoBruto)}
              icone={<CircleDollarSign className="h-5 w-5" strokeWidth={1.75} />}
              tom="success"
              delta={resumo.dados.faturamentoDelta}
            />
            <MetricCard
              rotulo="Ticket médio"
              valor={moeda(resumo.dados.ticketMedio)}
              icone={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
              tom="amber"
              delta={resumo.dados.ticketMedioDelta}
            />
            <MetricCard
              rotulo="Itens vendidos"
              valor={numero(resumo.dados.itensVendidos)}
              icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
              tom="purple"
              delta={resumo.dados.itensVendidosDelta}
            />
            <MetricCard
              rotulo="Canceladas"
              valor={numero(resumo.dados.canceladas)}
              icone={<CircleX className="h-5 w-5" strokeWidth={1.75} />}
              tom="danger"
              delta={resumo.dados.canceladasDelta}
              deltaInvertido
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
            {temFiltro ? 'Limpar filtros' : 'Filtros'}
          </Button>
        }
      >
        {/* A referência não rotula a busca — ela se alinha pela base dos selects. */}
        <div className="min-w-[150px] flex-1 self-end">
          <SearchInput
            valor={busca}
            aoMudar={(v) => {
              setBusca(v)
              setPagina(1)
            }}
            placeholder="Buscar por número da venda, cliente ou operador..."
          />
        </div>

        <FilterField label="Período" className="!min-w-0 w-[252px] flex-none">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={de}
              onChange={(e) => {
                setDe(e.target.value)
                setPagina(1)
              }}
              aria-label="Data inicial"
              className="mc-input px-2 text-[13px]"
            />
            <span className="shrink-0 text-caption text-muted">–</span>
            <input
              type="date"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value)
                setPagina(1)
              }}
              aria-label="Data final"
              className="mc-input px-2 text-[13px]"
            />
          </div>
        </FilterField>

        <FilterField label="Loja" className="!min-w-0 w-[148px] flex-none">
          <Select
            value={lojaId}
            onChange={(e) => {
              setLojaId(e.target.value)
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todas', label: 'Todas as lojas' },
              ...(lojas.dados ?? []).map((l) => ({ valor: l.id, label: l.nome })),
            ]}
          />
        </FilterField>

        <FilterField label="Forma de pagamento" className="!min-w-0 w-[172px] flex-none">
          <Select
            value={formaPagamento}
            onChange={(e) => {
              setFormaPagamento(e.target.value as FormaPagamentoVenda | 'todas')
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todas', label: 'Todas' },
              ...(Object.keys(ROTULOS_PAGAMENTO) as FormaPagamentoVenda[]).map((f) => ({
                valor: f,
                label: ROTULOS_PAGAMENTO[f],
              })),
            ]}
          />
        </FilterField>

        <FilterField label="Status" className="!min-w-0 w-[128px] flex-none">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusVenda | 'todos')
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todos', label: 'Todos' },
              { valor: 'concluida', label: 'Concluídas' },
              { valor: 'cancelada', label: 'Canceladas' },
            ]}
          />
        </FilterField>
      </FilterBar>

      <SectionCard
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
              rotuloItem="vendas"
            />
          ) : undefined
        }
      >
        <DataTable
          colunas={colunas}
          itens={lista.dados?.itens ?? []}
          chaveDe={(v) => v.id}
          carregando={lista.carregando}
          aoClicarLinha={(v) => navegar(`/vendas/${v.id}`)}
          vazio={
            <EmptyState
              icone={<ShoppingCart className="h-7 w-7" strokeWidth={1.5} />}
              titulo={temFiltro ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
              descricao={
                temFiltro
                  ? 'Nenhuma venda corresponde aos filtros aplicados. Ajuste o período ou limpe os filtros.'
                  : 'As vendas realizadas na loja aparecerão aqui.'
              }
              acao={
                temFiltro ? (
                  <Button variante="outline" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </SectionCard>
    </PageContainer>
  )
}
