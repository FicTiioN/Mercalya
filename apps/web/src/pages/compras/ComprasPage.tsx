import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Eye, Plus, Receipt, ShoppingCart, TrendingUp } from 'lucide-react'
import type { CompraListItem } from '@/services'
import { CompraService } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { data as formatarData, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback'
import { FilterBar, FilterField, SearchInput } from '@/components/ui/Form'

export function ComprasPage() {
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const buscaDebounced = useDebounce(busca)

  const resumo = useRecurso(() => CompraService.resumo(), [])
  const lista = useRecurso(
    () => CompraService.listar({ busca: buscaDebounced, pagina, porPagina }),
    [buscaDebounced, pagina, porPagina],
  )

  const colunas: Array<ColunaTabela<CompraListItem>> = [
    {
      chave: 'numero',
      cabecalho: 'Compra',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{c.numero}</p>
          <p className="truncate text-caption text-muted">NF {c.notaFiscal}</p>
        </div>
      ),
      largura: '140px',
    },
    {
      chave: 'fornecedor',
      cabecalho: 'Fornecedor',
      render: (c) => <span className="text-ink">{c.fornecedorNome}</span>,
    },
    {
      chave: 'entrada',
      cabecalho: 'Data de entrada',
      render: (c) => <span className="tabular text-muted">{formatarData(c.dataEntrada)}</span>,
      largura: '150px',
    },
    {
      chave: 'vencimento',
      cabecalho: 'Vencimento',
      render: (c) => <span className="tabular text-muted">{formatarData(c.dataVencimento)}</span>,
      largura: '130px',
    },
    {
      chave: 'itens',
      cabecalho: 'Itens',
      render: (c) => (
        <span className="tabular text-muted">
          {c.itens.length} prod. · {numero(c.totalItens)} un
        </span>
      ),
      largura: '160px',
    },
    {
      chave: 'total',
      cabecalho: 'Total',
      alinhamento: 'right',
      render: (c) => <span className="tabular font-medium">{moeda(c.total)}</span>,
      largura: '130px',
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
      largura: '120px',
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '80px',
      render: (c) => (
        <button
          type="button"
          aria-label={`Ver compra ${c.numero}`}
          onClick={(e) => {
            e.stopPropagation()
            navegar(`/operacao/compras/${c.id}`)
          }}
          className="rounded-md border border-line p-2 text-muted transition-colors hover:border-teal-100 hover:bg-teal-50 hover:text-teal"
        >
          <Eye className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Compras"
        descricao="Acompanhe as compras registradas e dê entrada de novos produtos no estoque central."
        acoes={
          <LinkButton
            to="/operacao/compras/nova"
            iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
          >
            Nova compra
          </LinkButton>
        }
      />

      <MetricGrid colunas={4}>
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
              rotulo="Compras do mês"
              valor={moeda(resumo.dados.totalMes)}
              icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
              tom="teal"
              delta={9.6}
            />
            <MetricCard
              rotulo="Notas registradas"
              valor={numero(resumo.dados.quantidadeMes)}
              icone={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
              tom="info"
              auxiliar="Nos últimos 30 dias"
            />
            <MetricCard
              rotulo="Ticket médio"
              valor={moeda(resumo.dados.ticketMedio)}
              icone={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
              tom="success"
              auxiliar="Por nota fiscal"
            />
            <MetricCard
              rotulo="Última entrada"
              valor={
                resumo.dados.ultimaCompra ? formatarData(resumo.dados.ultimaCompra) : '—'
              }
              icone={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
              tom="amber"
              auxiliar="Data da última compra confirmada"
            />
          </>
        )}
      </MetricGrid>

      <FilterBar>
        <FilterField label="Buscar compra" className="min-w-[280px] flex-1">
          <SearchInput
            valor={busca}
            aoMudar={(v) => {
              setBusca(v)
              setPagina(1)
            }}
            placeholder="Buscar por número, nota fiscal ou fornecedor..."
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
              rotuloItem="compras"
            />
          ) : undefined
        }
      >
        <DataTable
          colunas={colunas}
          itens={lista.dados?.itens ?? []}
          chaveDe={(c) => c.id}
          carregando={lista.carregando}
          aoClicarLinha={(c) => navegar(`/operacao/compras/${c.id}`)}
          vazio={
            <EmptyState
              icone={<ShoppingCart className="h-7 w-7" strokeWidth={1.5} />}
              titulo={buscaDebounced ? 'Nenhuma compra encontrada' : 'Nenhuma compra realizada'}
              descricao={
                buscaDebounced
                  ? 'Nenhuma compra corresponde à busca aplicada.'
                  : 'Registre a primeira compra para dar entrada de produtos no estoque central.'
              }
              acao={
                buscaDebounced ? (
                  <Button variante="outline" onClick={() => setBusca('')}>
                    Limpar busca
                  </Button>
                ) : (
                  <LinkButton
                    to="/operacao/compras/nova"
                    iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
                  >
                    Nova compra
                  </LinkButton>
                )
              }
            />
          }
        />
      </SectionCard>
    </PageContainer>
  )
}
