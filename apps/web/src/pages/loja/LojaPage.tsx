import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CircleDollarSign,
  History,
  Package,
  Pencil,
  ShoppingCart,
  Store,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import type { ItemLojaView } from '@/models'
import { AppSession, LojaService, ProdutoService } from '@/services'
import type { ConsultaLoja } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, moeda, numero, paraNumero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { DataTable, type ColunaTabela } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback'
import {
  FilterBar,
  FilterField,
  FormField,
  Input,
  SearchInput,
  Select,
  Toggle,
} from '@/components/ui/Form'
import { Dialog } from '@/components/ui/Dialog'
import { QuickAction } from '@/components/ui/Drawer'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

export function LojaPage() {
  const navegar = useNavigate()

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<ConsultaLoja['status']>('todos')
  const [retirando, setRetirando] = useState<ItemLojaView | null>(null)
  const [editando, setEditando] = useState<ItemLojaView | null>(null)

  const buscaDebounced = useDebounce(busca)

  const resumo = useRecurso(() => LojaService.resumo(), [])
  const lista = useRecurso(
    () => LojaService.listar({ busca: buscaDebounced, status }),
    [buscaDebounced, status],
  )

  const recarregarTudo = () => {
    lista.recarregar()
    resumo.recarregar()
  }

  const temFiltro = Boolean(buscaDebounced) || status !== 'todos'

  const colunas: Array<ColunaTabela<ItemLojaView>> = [
    {
      chave: 'produto',
      cabecalho: 'Produto',
      render: (i) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductAvatar imagem={i.produtoImagem} nome={i.produtoNome} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{i.produtoNome}</p>
            <p className="truncate text-caption text-muted">{i.categoriaNome}</p>
          </div>
        </div>
      ),
    },
    {
      chave: 'quantidade',
      cabecalho: 'Qtd. na loja',
      largura: '124px',
      render: (i) => (
        <span
          className={cn(
            'tabular font-medium',
            i.quantidade === 0
              ? 'text-danger'
              : i.status === 'estoque-baixo'
                ? 'text-[#D68A0F]'
                : 'text-ink',
          )}
        >
          {numero(i.quantidade)} un
        </span>
      ),
    },
    {
      chave: 'minimo',
      cabecalho: 'Mín. loja',
      largura: '104px',
      render: (i) => <span className="tabular text-muted">{numero(i.estoqueMinimo)} un</span>,
    },
    {
      chave: 'preco',
      cabecalho: 'Preço',
      largura: '124px',
      render: (i) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditando(i)
          }}
          title="Editar preço e mínimo nesta loja"
          className="-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 tabular text-ink transition-colors hover:bg-teal-50 hover:text-teal"
        >
          {moeda(i.precoVenda)}
        </button>
      ),
    },
    {
      chave: 'reposicao',
      cabecalho: 'Última reposição',
      largura: '150px',
      render: (i) => (
        <span className="tabular text-muted">
          {i.ultimaReposicao ? formatarData(i.ultimaReposicao) : '—'}
        </span>
      ),
    },
    {
      chave: 'status',
      cabecalho: 'Disponibilidade',
      largura: '150px',
      render: (i) =>
        i.ativo ? (
          <StatusBadge status={i.status} />
        ) : (
          <StatusBadge status="inativo" label="Não vendido" />
        ),
    },
    {
      chave: 'acoes',
      cabecalho: 'Ações',
      alinhamento: 'right',
      largura: '104px',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Editar ${i.produtoNome} nesta loja`}
            onClick={(e) => {
              e.stopPropagation()
              setEditando(i)
            }}
            className="rounded-md p-2 text-muted transition-colors hover:bg-teal-50 hover:text-teal"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Retirar ${i.produtoNome} da loja`}
            disabled={i.quantidade === 0}
            onClick={(e) => {
              e.stopPropagation()
              setRetirando(i)
            }}
            className="rounded-md p-2 text-muted transition-colors hover:bg-danger-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        titulo="Produtos na loja"
        descricao="Acompanhe o que está disponível para venda na loja."
        acoes={
          <Button
            iconeEsquerda={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
            onClick={() => navegar('/operacao/abastecimento')}
          >
            Abastecer loja
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
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
                  rotulo="Itens na loja"
                  valor={numero(resumo.dados.itensExpostos)}
                  icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
                  tom="teal"
                  delta={resumo.dados.itensExpostosDelta}
                  deltaSufixo="vs ontem"
                />
                <MetricCard
                  rotulo="Valor potencial de venda"
                  valor={moeda(resumo.dados.valorPotencialVenda)}
                  icone={<CircleDollarSign className="h-5 w-5" strokeWidth={1.75} />}
                  tom="success"
                  delta={resumo.dados.valorPotencialDelta}
                  deltaSufixo="vs ontem"
                />
                <MetricCard
                  rotulo="Precisam de reposição"
                  valor={numero(resumo.dados.estoqueBaixoNaLoja)}
                  icone={<TriangleAlert className="h-5 w-5" strokeWidth={1.75} />}
                  tom="amber"
                  auxiliar="Abaixo do mínimo ou zerados"
                />
                <MetricCard
                  rotulo="Reposição sugerida"
                  valor={`${numero(resumo.dados.reposicaoSugerida)} itens`}
                  icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
                  tom="info"
                  auxiliar={<span className="text-info">{moeda(resumo.dados.valorReposicao)}</span>}
                />
              </>
            )}
          </MetricGrid>

          <FilterBar>
            <FilterField label="Buscar produto" className="min-w-[260px] flex-1">
              <SearchInput valor={busca} aoMudar={setBusca} placeholder="Buscar produto..." />
            </FilterField>
            <FilterField label="Disponibilidade" className="min-w-[200px] flex-none">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ConsultaLoja['status'])}
                opcoes={[
                  { valor: 'todos', label: 'Todos' },
                  { valor: 'disponivel', label: 'Disponível' },
                  { valor: 'estoque-baixo', label: 'Estoque baixo' },
                  { valor: 'indisponivel', label: 'Indisponível' },
                  { valor: 'nao-vendido', label: 'Não vendidos nesta loja' },
                ]}
              />
            </FilterField>
          </FilterBar>

          <SectionCard
            titulo={
              lista.dados
                ? `${lista.dados.length} ${lista.dados.length === 1 ? 'produto' : 'produtos'} na loja`
                : 'Produtos na loja'
            }
            semPaddingCorpo
          >
            <DataTable
              colunas={colunas}
              itens={lista.dados ?? []}
              chaveDe={(i) => i.produtoId}
              carregando={lista.carregando}
              vazio={
                temFiltro ? (
                  <EmptyState
                    icone={<Store className="h-7 w-7" strokeWidth={1.5} />}
                    titulo="Nenhum produto encontrado"
                    descricao="Nenhum produto corresponde aos filtros aplicados."
                    acao={
                      <Button
                        variante="outline"
                        onClick={() => {
                          setBusca('')
                          setStatus('todos')
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icone={<Store className="h-7 w-7" strokeWidth={1.5} />}
                    titulo="Nenhum produto na loja"
                    descricao="Abasteça a loja a partir do estoque central para começar a vender."
                    acao={
                      <Button onClick={() => navegar('/operacao/abastecimento')}>
                        Abastecer loja
                      </Button>
                    }
                  />
                )
              }
            />
          </SectionCard>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard titulo="Ações rápidas" classeCorpo="space-y-2 pt-4">
            <QuickAction
              icone={<ShoppingCart className="h-4.5 w-4.5" strokeWidth={1.75} />}
              descricao="Enviar produtos do estoque central"
              onClick={() => navegar('/operacao/abastecimento')}
            >
              Abastecer loja
            </QuickAction>
            <QuickAction
              icone={<TriangleAlert className="h-4.5 w-4.5" strokeWidth={1.75} />}
              descricao="Baixar itens vencidos ou avariados"
              onClick={() => navegar('/operacao/perdas-ajustes')}
            >
              Registrar perda
            </QuickAction>
            <QuickAction
              icone={<History className="h-4.5 w-4.5" strokeWidth={1.75} />}
              descricao="Entradas, transferências e perdas"
              onClick={() => navegar('/operacao/movimentacoes')}
            >
              Ver movimentações
            </QuickAction>
          </SectionCard>
        </aside>
      </div>

      <DialogConfigLoja
        item={editando}
        aoFechar={() => setEditando(null)}
        aoConcluir={() => {
          setEditando(null)
          recarregarTudo()
        }}
      />

      <DialogRetirar
        item={retirando}
        aoFechar={() => setRetirando(null)}
        aoConcluir={() => {
          setRetirando(null)
          recarregarTudo()
        }}
      />
    </PageContainer>
  )
}

/**
 * Ajuste rápido de preço a partir da loja. O lugar canônico de definir preço é
 * o cadastro do produto; aqui é onde o operador corrige o que vê.
 */
function DialogConfigLoja({
  item,
  aoFechar,
  aoConcluir,
}: {
  item: ItemLojaView | null
  aoFechar: () => void
  aoConcluir: () => void
}) {
  const toast = useToast()
  const [preco, setPreco] = useState('')
  const [minimo, setMinimo] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!item) return
    setPreco(item.precoVenda.toFixed(2).replace('.', ','))
    setMinimo(String(item.estoqueMinimo))
    setAtivo(item.ativo)
  }, [item])

  const confirmar = async () => {
    if (!item) return
    setSalvando(true)
    try {
      await ProdutoService.salvarConfiguracaoLoja(item.produtoId, AppSession.lojaAtualId(), {
        precoVenda: paraNumero(preco),
        estoqueMinimo: Number(minimo) || 0,
        ativo,
      })
      toast.sucesso(
        'Configuração salva',
        `${item.produtoNome} · ${moeda(paraNumero(preco))} · mínimo ${Number(minimo) || 0} un`,
      )
      aoConcluir()
    } catch (e) {
      toast.erro('Não foi possível salvar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      aberto={item !== null}
      aoFechar={aoFechar}
      titulo="Configuração nesta loja"
      descricao={item ? `${item.produtoNome} · ${AppSession.lojaAtual()}` : undefined}
      larguraMaxima="max-w-md"
      rodape={
        <>
          <Button variante="ghost" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirmar()}
            carregando={salvando}
            disabled={ativo && paraNumero(preco) <= 0}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2/50 px-4 py-3">
          <span className="text-caption text-muted">Quantidade na loja</span>
          <span className="font-display text-card-title font-semibold tabular text-ink">
            {numero(item?.quantidade ?? 0)} un
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Preço de venda (R$)" obrigatorio={ativo} htmlFor="cfg-preco">
            <Input
              id="cfg-preco"
              value={preco}
              inputMode="decimal"
              disabled={!ativo}
              onChange={(e) => setPreco(e.target.value)}
              autoFocus
            />
          </FormField>

          <FormField
            label="Estoque mínimo"
            helper="Abaixo disto a loja precisa ser reabastecida."
            htmlFor="cfg-minimo"
          >
            <Input
              id="cfg-minimo"
              type="number"
              min={0}
              value={minimo}
              disabled={!ativo}
              onChange={(e) => setMinimo(e.target.value)}
            />
          </FormField>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-label font-medium text-ink">Vende nesta loja</p>
              <p className="mt-0.5 text-caption text-muted">
                Ao desativar, o produto sai desta loja. O cadastro e as demais lojas não mudam.
              </p>
            </div>
            <Toggle ativo={ativo} aoMudar={setAtivo} />
          </div>
        </div>

        <p className="text-caption text-muted">
          Estas informações valem <strong className="text-ink">apenas para esta loja</strong>.
        </p>
      </div>
    </Dialog>
  )
}

function DialogRetirar({
  item,
  aoFechar,
  aoConcluir,
}: {
  item: ItemLojaView | null
  aoFechar: () => void
  aoConcluir: () => void
}) {
  const toast = useToast()
  const [quantidade, setQuantidade] = useState('')
  const [salvando, setSalvando] = useState(false)

  const confirmar = async () => {
    if (!item) return
    setSalvando(true)
    try {
      await LojaService.retirarDaLoja(item.produtoId, Number(quantidade))
      toast.sucesso(
        'Produto retirado da loja',
        `${quantidade} un de ${item.produtoNome} voltaram para o estoque central.`,
      )
      setQuantidade('')
      aoConcluir()
    } catch (e) {
      toast.erro('Não foi possível retirar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      aberto={item !== null}
      aoFechar={aoFechar}
      titulo="Retirar da loja"
      descricao={item ? `${item.produtoNome} · ${numero(item.quantidade)} un na loja` : undefined}
      larguraMaxima="max-w-md"
      rodape={
        <>
          <Button variante="ghost" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            variante="danger"
            onClick={() => void confirmar()}
            carregando={salvando}
            disabled={!quantidade}
          >
            Retirar da loja
          </Button>
        </>
      }
    >
      <FormField
        label="Quantidade a retirar"
        obrigatorio
        helper="Os itens voltam para o estoque central e geram uma movimentação de devolução."
        htmlFor="qtd-retirar"
      >
        <Input
          id="qtd-retirar"
          type="number"
          min={1}
          max={item?.quantidade}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder={String(item?.quantidade ?? 0)}
          autoFocus
        />
      </FormField>
    </Dialog>
  )
}
