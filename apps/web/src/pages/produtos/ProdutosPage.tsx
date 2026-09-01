import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CircleCheck,
  Info,
  Ellipsis,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import type { ProdutoListItem } from '@/models'
import { ProdutoService } from '@/services'
import type { ConsultaProdutos } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { moeda, numero, percentual } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback'
import { FilterBar, FilterField, SearchInput, Select } from '@/components/ui/Form'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

export function ProdutosPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState('todas')
  const [status, setStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [estoque, setEstoque] = useState<ConsultaProdutos['estoque']>('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)

  const buscaDebounced = useDebounce(busca)

  const categorias = useRecurso(() => ProdutoService.categorias(), [])
  const resumo = useRecurso(() => ProdutoService.resumo(), [])
  const lista = useRecurso(
    () =>
      ProdutoService.listar({
        busca: buscaDebounced,
        categoriaId,
        status,
        estoque,
        pagina,
        porPagina,
      }),
    [buscaDebounced, categoriaId, status, estoque, pagina, porPagina],
  )

  const temFiltro =
    Boolean(buscaDebounced) || categoriaId !== 'todas' || status !== 'todos' || estoque !== 'todos'

  const limparFiltros = () => {
    setBusca('')
    setCategoriaId('todas')
    setStatus('todos')
    setEstoque('todos')
    setPagina(1)
  }

  const alternarStatus = async (produto: ProdutoListItem) => {
    setMenuAberto(null)
    try {
      const atualizado = await ProdutoService.alternarStatus(produto.id)
      toast.sucesso(
        atualizado.status === 'ativo' ? 'Produto ativado' : 'Produto desativado',
        atualizado.nome,
      )
      lista.recarregar()
      resumo.recarregar()
    } catch (e) {
      toast.erro('Não foi possível alterar o status', (e as Error).message)
    }
  }

  const colunas: Array<ColunaTabela<ProdutoListItem>> = [
    {
      chave: 'produto',
      cabecalho: 'Produto',
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductAvatar imagem={p.imagem} nome={p.nome} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{p.nome}</p>
            {p.marcaNome && <p className="truncate text-caption text-muted">{p.marcaNome}</p>}
          </div>
        </div>
      ),
    },
    {
      chave: 'ean',
      cabecalho: 'Código / EAN',
      render: (p) => <span className="tabular text-muted">{p.ean || '—'}</span>,
      largura: '160px',
    },
    {
      chave: 'categoria',
      cabecalho: 'Categoria',
      render: (p) => <span className="text-muted">{p.categoriaNome}</span>,
      largura: '150px',
    },
    {
      chave: 'unidade',
      cabecalho: 'Unidade',
      render: (p) => <span className="text-muted">{p.unidade}</span>,
      largura: '92px',
    },
    {
      chave: 'preco',
      cabecalho: 'Preço de venda',
      render: (p) =>
        p.precoNaLoja === null ? (
          <span className="text-caption text-muted">não vendido</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="tabular font-medium">{moeda(p.precoNaLoja)}</span>
            {p.precosVariam && (
              <span
                title="As lojas praticam preços diferentes para este produto"
                className="rounded bg-surface-2 px-1 text-[10px] font-medium text-muted"
              >
                varia
              </span>
            )}
          </span>
        ),
      largura: '130px',
    },
    {
      chave: 'estoque',
      cabecalho: 'Estoque total',
      render: (p) => (
        <span
          className={cn(
            'tabular font-semibold',
            p.estoqueTotal === 0
              ? 'text-danger'
              : p.estoqueBaixo
                ? 'text-[#D68A0F]'
                : 'text-success',
          )}
        >
          {numero(p.estoqueTotal)}
        </span>
      ),
      largura: '120px',
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
      largura: '104px',
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '110px',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label={`Editar ${p.nome}`}
            onClick={() => navegar(`/cadastros/produtos/${p.id}`)}
            className="rounded-md border border-line p-2 text-muted transition-colors hover:border-teal-100 hover:bg-teal-50 hover:text-teal"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={`Mais ações para ${p.nome}`}
              onClick={() => setMenuAberto(menuAberto === p.id ? null : p.id)}
              className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Ellipsis className="h-4 w-4" strokeWidth={1.75} />
            </button>

            {menuAberto === p.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuAberto(null)}
                  aria-hidden
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 text-left shadow-pop">
                  <button
                    type="button"
                    className="w-full px-3.5 py-2 text-left text-body text-ink transition-colors hover:bg-surface-2"
                    onClick={() => navegar(`/cadastros/produtos/${p.id}`)}
                  >
                    Editar produto
                  </button>
                  <button
                    type="button"
                    className="w-full px-3.5 py-2 text-left text-body text-ink transition-colors hover:bg-surface-2"
                    onClick={() => {
                      setMenuAberto(null)
                      navegar('/operacao/compras/nova')
                    }}
                  >
                    Comprar produto
                  </button>
                  <button
                    type="button"
                    className="w-full border-t border-line px-3.5 py-2 text-left text-body text-ink transition-colors hover:bg-surface-2"
                    onClick={() => void alternarStatus(p)}
                  >
                    {p.status === 'ativo' ? 'Desativar produto' : 'Ativar produto'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Produtos"
        descricao="Gerencie seu catálogo de produtos, estoque e informações de venda."
        acoes={
          <>
            <Button
              variante="outline"
              iconeEsquerda={<Upload className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() =>
                toast.info(
                  'Importação de CSV',
                  'Disponível na próxima fase — os dados virão da API.',
                )
              }
            >
              Importar CSV
            </Button>
            <LinkButton
              to="/cadastros/produtos/novo"
              iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
            >
              Novo produto
            </LinkButton>
          </>
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
              rotulo="Total de produtos"
              valor={numero(resumo.dados.total)}
              icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
              tom="teal"
              delta={resumo.dados.deltaTotal}
            />
            <MetricCard
              rotulo="Produtos ativos"
              valor={numero(resumo.dados.ativos)}
              icone={<CircleCheck className="h-5 w-5" strokeWidth={1.75} />}
              tom="success"
              auxiliar={`${percentual(resumo.dados.percentualAtivos)} do total`}
            />
            <MetricCard
              rotulo="Estoque baixo"
              valor={numero(resumo.dados.estoqueBaixo)}
              icone={<TriangleAlert className="h-5 w-5" strokeWidth={1.75} />}
              tom="amber"
              auxiliar={`${percentual(resumo.dados.percentualEstoqueBaixo)} do total`}
            />
            <MetricCard
              rotulo="Sem giro (30 dias)"
              valor={numero(resumo.dados.semGiro)}
              icone={<Info className="h-5 w-5" strokeWidth={1.75} />}
              tom="info"
              auxiliar={`${percentual(resumo.dados.percentualSemGiro)} do total`}
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
        <FilterField label="Buscar produto" className="min-w-[260px] flex-[1.4]">
          <SearchInput
            valor={busca}
            aoMudar={(v) => {
              setBusca(v)
              setPagina(1)
            }}
            placeholder="Buscar por nome, código ou EAN..."
          />
        </FilterField>

        <FilterField label="Categoria">
          <Select
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value)
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todas', label: 'Todas as categorias' },
              ...(categorias.dados ?? []).map((c) => ({ valor: c.id, label: c.nome })),
            ]}
          />
        </FilterField>

        <FilterField label="Status" className="min-w-[150px] flex-none">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'todos' | 'ativo' | 'inativo')
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todos', label: 'Todos' },
              { valor: 'ativo', label: 'Ativos' },
              { valor: 'inativo', label: 'Inativos' },
            ]}
          />
        </FilterField>

        <FilterField label="Estoque" className="min-w-[150px] flex-none">
          <Select
            value={estoque}
            onChange={(e) => {
              setEstoque(e.target.value as ConsultaProdutos['estoque'])
              setPagina(1)
            }}
            opcoes={[
              { valor: 'todos', label: 'Todos' },
              { valor: 'ok', label: 'Normal' },
              { valor: 'baixo', label: 'Estoque baixo' },
              { valor: 'zerado', label: 'Zerado' },
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
              rotuloItem="produtos"
            />
          ) : undefined
        }
      >
        <DataTable
          colunas={colunas}
          itens={lista.dados?.itens ?? []}
          chaveDe={(p) => p.id}
          carregando={lista.carregando}
          vazio={
            temFiltro ? (
              <EmptyState
                icone={<PackageOpen className="h-7 w-7" strokeWidth={1.5} />}
                titulo="Nenhum produto encontrado"
                descricao="Nenhum produto corresponde aos filtros aplicados. Ajuste a busca ou limpe os filtros."
                acao={
                  <Button variante="outline" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icone={<Package className="h-7 w-7" strokeWidth={1.5} />}
                titulo="Nenhum produto cadastrado"
                descricao="Cadastre seu primeiro produto para começar a organizar o catálogo da sua loja."
                acao={
                  <LinkButton
                    to="/cadastros/produtos/novo"
                    iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
                  >
                    Novo produto
                  </LinkButton>
                }
              />
            )
          }
        />
      </SectionCard>

    </PageContainer>
  )
}
