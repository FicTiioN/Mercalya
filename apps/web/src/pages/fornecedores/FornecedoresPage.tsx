import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ban,
  ChartNoAxesColumn,
  CircleCheck,
  Ellipsis,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Upload,
  User,
  Users,
} from 'lucide-react'
import type { FornecedorListItem } from '@/models'
import { FornecedorService, ProdutoService } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { data as formatarData, moeda, numero, percentual } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, Pagination, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, SkeletonCard, SkeletonLinhas } from '@/components/ui/Feedback'
import { FilterBar, FilterField, SearchInput, Select } from '@/components/ui/Form'
import {
  Drawer,
  DrawerEstatistica,
  DrawerLinha,
  DrawerSection,
  QuickAction,
} from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/toast-context'

export function FornecedoresPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [categoriaId, setCategoriaId] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState(false)

  const buscaDebounced = useDebounce(busca)

  const categorias = useRecurso(() => ProdutoService.categorias(), [])
  const resumo = useRecurso(() => FornecedorService.resumo(), [])
  const lista = useRecurso(
    () =>
      FornecedorService.listar({
        busca: buscaDebounced,
        status,
        categoriaId,
        pagina,
        porPagina,
      }),
    [buscaDebounced, status, categoriaId, pagina, porPagina],
  )

  const selecionado = lista.dados?.itens.find((f) => f.id === selecionadoId) ?? null

  const temFiltro = Boolean(buscaDebounced) || status !== 'todos' || categoriaId !== 'todas'
  const limparFiltros = () => {
    setBusca('')
    setStatus('todos')
    setCategoriaId('todas')
    setPagina(1)
  }

  const colunas: Array<ColunaTabela<FornecedorListItem>> = [
    {
      chave: 'fornecedor',
      cabecalho: 'Fornecedor',
      render: (f) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{f.nome}</p>
          <p className="truncate text-caption text-muted">{f.contato.nome || 'Sem contato'}</p>
        </div>
      ),
    },
    {
      chave: 'documento',
      cabecalho: 'CNPJ',
      render: (f) => (
        <span className="whitespace-nowrap tabular text-muted">{f.documento || '—'}</span>
      ),
      largura: '160px',
    },
    {
      chave: 'categoria',
      cabecalho: 'Categoria principal',
      render: (f) => <span className="text-muted">{f.categoriaNome}</span>,
      largura: '160px',
    },
    {
      chave: 'cidade',
      cabecalho: 'Cidade',
      render: (f) => (
        <span className="text-muted">
          {f.endereco.cidade ? `${f.endereco.cidade}, ${f.endereco.uf}` : '—'}
        </span>
      ),
      largura: '140px',
    },
    {
      chave: 'telefone',
      cabecalho: 'Telefone',
      render: (f) => (
        <span className="whitespace-nowrap tabular text-muted">{f.contato.telefone || '—'}</span>
      ),
      largura: '140px',
    },
    {
      chave: 'ultima',
      cabecalho: 'Última compra',
      render: (f) => (
        <span className="whitespace-nowrap tabular text-muted">
          {f.ultimaCompra ? formatarData(f.ultimaCompra) : '—'}
        </span>
      ),
      largura: '130px',
    },
    {
      chave: 'produtos',
      cabecalho: 'Produtos',
      render: (f) => <span className="tabular">{f.totalProdutos}</span>,
      largura: '96px',
    },
    {
      chave: 'status',
      cabecalho: 'Status',
      render: (f) => <StatusBadge status={f.status} />,
      largura: '104px',
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '80px',
      render: (f) => (
        <button
          type="button"
          aria-label={`Detalhes de ${f.nome}`}
          onClick={(e) => {
            e.stopPropagation()
            setSelecionadoId(f.id)
          }}
          className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Ellipsis className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Fornecedores"
        descricao="Gerencie seus fornecedores e acompanhe o desempenho de cada parceria."
        acoes={
          <>
            <Button
              variante="outline"
              iconeEsquerda={<Upload className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() =>
                toast.info('Importar contatos', 'Disponível quando a API estiver conectada.')
              }
            >
              Importar contatos
            </Button>
            <LinkButton
              to="/cadastros/fornecedores/novo"
              iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
            >
              Novo fornecedor
            </LinkButton>
          </>
        }
      />

      <div className="flex min-w-0 gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <MetricGrid colunas={selecionado ? 3 : 4}>
            {resumo.carregando || !resumo.dados ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                {!selecionado && <SkeletonCard />}
              </>
            ) : (
              <>
                <MetricCard
                  rotulo="Total de fornecedores"
                  valor={numero(resumo.dados.total)}
                  icone={<Users className="h-5 w-5" strokeWidth={1.75} />}
                  tom="info"
                  auxiliar={
                    <span className="text-success">
                      ↑ {resumo.dados.novosNoMes} novos este mês
                    </span>
                  }
                />
                <MetricCard
                  rotulo="Fornecedores ativos"
                  valor={numero(resumo.dados.ativos)}
                  icone={<CircleCheck className="h-5 w-5" strokeWidth={1.75} />}
                  tom="success"
                  auxiliar={`${percentual(resumo.dados.percentualAtivos)} do total`}
                />
                <MetricCard
                  rotulo="Compras na semana"
                  valor={moeda(resumo.dados.comprasSemana)}
                  icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
                  tom="amber"
                  delta={resumo.dados.comprasSemanaDelta}
                  deltaSufixo="vs semana anterior"
                />
                {!selecionado && (
                  <MetricCard
                    rotulo="Sem movimentação"
                    valor={numero(resumo.dados.semMovimentacao)}
                    icone={<Store className="h-5 w-5" strokeWidth={1.75} />}
                    tom="purple"
                    auxiliar="Desde 60+ dias"
                  />
                )}
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
                {temFiltro ? 'Limpar filtros' : 'Mais filtros'}
              </Button>
            }
          >
            <FilterField label="Buscar fornecedor" className="min-w-[240px] flex-[1.4]">
              <SearchInput
                valor={busca}
                aoMudar={(v) => {
                  setBusca(v)
                  setPagina(1)
                }}
                placeholder="Buscar fornecedores..."
              />
            </FilterField>

            <FilterField label="Status" className="min-w-[160px] flex-none">
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

            <FilterField label="Categoria" className="min-w-[180px] flex-none">
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
          </FilterBar>

          <SectionCard
            titulo={
              lista.dados
                ? `${lista.dados.total} ${lista.dados.total === 1 ? 'fornecedor encontrado' : 'fornecedores encontrados'}`
                : 'Fornecedores'
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
                  rotuloItem="fornecedores"
                />
              ) : undefined
            }
          >
            <DataTable
              colunas={colunas}
              itens={lista.dados?.itens ?? []}
              chaveDe={(f) => f.id}
              carregando={lista.carregando}
              aoClicarLinha={(f) => setSelecionadoId(f.id)}
              linhaSelecionada={(f) => f.id === selecionadoId}
              vazio={
                temFiltro ? (
                  <EmptyState
                    icone={<Users className="h-7 w-7" strokeWidth={1.5} />}
                    titulo="Nenhum fornecedor encontrado"
                    descricao="Nenhum fornecedor corresponde aos filtros aplicados."
                    acao={
                      <Button variante="outline" onClick={limparFiltros}>
                        Limpar filtros
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icone={<Users className="h-7 w-7" strokeWidth={1.5} />}
                    titulo="Nenhum fornecedor cadastrado"
                    descricao="Cadastre fornecedores para registrar compras e abastecer o estoque central."
                    acao={
                      <LinkButton
                        to="/cadastros/fornecedores/novo"
                        iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
                      >
                        Novo fornecedor
                      </LinkButton>
                    }
                  />
                )
              }
            />
          </SectionCard>
        </div>

        {selecionado && (
          <DrawerFornecedor
            fornecedor={selecionado}
            aoFechar={() => setSelecionadoId(null)}
            aoEditar={() => navegar(`/cadastros/fornecedores/${selecionado.id}`)}
            aoDesativar={() => setConfirmarDesativar(true)}
            aoVerCompras={() => navegar('/operacao/compras')}
            aoVerProdutos={() => navegar('/cadastros/produtos')}
          />
        )}
      </div>

      <ConfirmDialog
        aberto={confirmarDesativar}
        aoFechar={() => setConfirmarDesativar(false)}
        aoConfirmar={async () => {
          if (!selecionado) return
          try {
            const f = await FornecedorService.alternarStatus(selecionado.id)
            toast.sucesso(
              f.status === 'ativo' ? 'Fornecedor ativado' : 'Fornecedor desativado',
              f.nome,
            )
            lista.recarregar()
            resumo.recarregar()
          } catch (e) {
            toast.erro('Não foi possível alterar o status', (e as Error).message)
          } finally {
            setConfirmarDesativar(false)
          }
        }}
        titulo={
          selecionado?.status === 'ativo' ? 'Desativar fornecedor' : 'Ativar fornecedor'
        }
        descricao={
          selecionado?.status === 'ativo' ? (
            <>
              <strong className="text-ink">{selecionado?.nome}</strong> deixará de aparecer na
              seleção de novas compras. O histórico existente é preservado.
            </>
          ) : (
            <>
              <strong className="text-ink">{selecionado?.nome}</strong> voltará a ficar disponível
              para novas compras.
            </>
          )
        }
        rotuloConfirmar={selecionado?.status === 'ativo' ? 'Desativar' : 'Ativar'}
        destrutivo={selecionado?.status === 'ativo'}
      />
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */

function DrawerFornecedor({
  fornecedor,
  aoFechar,
  aoEditar,
  aoDesativar,
  aoVerCompras,
  aoVerProdutos,
}: {
  fornecedor: FornecedorListItem
  aoFechar: () => void
  aoEditar: () => void
  aoDesativar: () => void
  aoVerCompras: () => void
  aoVerProdutos: () => void
}) {
  const produtos = useRecurso(
    () => FornecedorService.produtosFornecidos(fornecedor.id),
    [fornecedor.id],
  )

  return (
    <Drawer
      aberto
      aoFechar={aoFechar}
      titulo={fornecedor.nome}
      acessorioTitulo={<StatusBadge status={fornecedor.status} />}
      className="self-start xl:sticky xl:top-[100px]"
    >
      <DrawerSection titulo="Contato">
        <DrawerLinha
          icone={<User className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Nome fantasia"
          valor={fornecedor.nomeFantasia || '—'}
        />
        <DrawerLinha
          icone={<User className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Responsável"
          valor={fornecedor.contato.nome || '—'}
        />
        <DrawerLinha
          icone={<Mail className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="E-mail"
          valor={fornecedor.contato.email || '—'}
        />
        <DrawerLinha
          icone={<Phone className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Telefone"
          valor={fornecedor.contato.telefone || '—'}
        />
        <DrawerLinha
          icone={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Cidade / UF"
          valor={`${fornecedor.endereco.cidade}, ${fornecedor.endereco.uf}`}
        />
      </DrawerSection>

      <DrawerSection titulo="Produtos fornecidos">
        {produtos.carregando ? (
          <SkeletonLinhas linhas={3} />
        ) : produtos.dados && produtos.dados.length > 0 ? (
          <ul className="space-y-2">
            {produtos.dados.slice(0, 5).map((p) => (
              <li key={p.produtoId} className="flex items-center gap-2.5">
                <span className="text-[16px]" aria-hidden>
                  {p.imagem}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label text-ink">{p.nome}</span>
                  <span className="block truncate text-caption text-muted">{p.categoriaNome}</span>
                </span>
                <span className="shrink-0 text-caption tabular text-muted">{p.quantidade} un</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compacto
            icone={<Package className="h-5 w-5" strokeWidth={1.5} />}
            titulo="Nenhum produto vinculado"
            descricao="Defina este fornecedor como principal em algum produto."
          />
        )}
      </DrawerSection>

      <DrawerSection titulo="Estatísticas rápidas">
        <DrawerEstatistica
          rotulo="Compras (12 meses)"
          valor={moeda(fornecedor.valorCompras12m)}
        />
        <DrawerEstatistica rotulo="Tickets de compra" valor={fornecedor.totalCompras} />
        <DrawerEstatistica rotulo="Produtos fornecidos" valor={fornecedor.totalProdutos} />
        <DrawerEstatistica
          rotulo="Prazo de entrega"
          valor={
            fornecedor.comercial.prazoEntregaDias
              ? `${fornecedor.comercial.prazoEntregaDias} dias`
              : '—'
          }
        />
        <DrawerEstatistica
          rotulo="Última compra"
          valor={fornecedor.ultimaCompra ? formatarData(fornecedor.ultimaCompra) : '—'}
        />
      </DrawerSection>

      <DrawerSection titulo="Ações rápidas" className="pb-2">
        <div className="space-y-2">
          <QuickAction
            icone={<ChartNoAxesColumn className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={aoVerCompras}
          >
            Ver histórico de compras
          </QuickAction>
          <QuickAction
            icone={<Package className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={aoVerProdutos}
          >
            Produtos fornecidos
          </QuickAction>
          <QuickAction
            icone={<Pencil className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={aoEditar}
          >
            Editar fornecedor
          </QuickAction>
          <QuickAction
            icone={<Ban className="h-4.5 w-4.5" strokeWidth={1.75} />}
            onClick={aoDesativar}
            destrutivo={fornecedor.status === 'ativo'}
          >
            {fornecedor.status === 'ativo' ? 'Desativar fornecedor' : 'Ativar fornecedor'}
          </QuickAction>
        </div>
      </DrawerSection>

    </Drawer>
  )
}
