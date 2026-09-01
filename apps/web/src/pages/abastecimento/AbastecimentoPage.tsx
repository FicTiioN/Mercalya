import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  Boxes,
  CircleCheck,
  Eye,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react'
import { AbastecimentoService } from '@/services'
import type { ProdutoDisponivel } from '@/services'
import { useDebounce, useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { dataHora, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { SearchInput, Select } from '@/components/ui/Form'
import { Contador, ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

interface ItemCarrinho {
  produtoId: string
  nome: string
  imagem: string
  quantidade: number
  disponivel: number
}

export function AbastecimentoPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'nome' | 'disponivel' | 'loja'>('nome')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [confirmando, setConfirmando] = useState(false)

  const buscaDebounced = useDebounce(busca)

  const cabecalho = useRecurso(() => AbastecimentoService.origemDestino(), [carrinho.length])
  const disponiveis = useRecurso(
    () => AbastecimentoService.produtosDisponiveis(buscaDebounced),
    [buscaDebounced],
  )
  const recentes = useRecurso(() => AbastecimentoService.recentes(5), [])

  const ordenados = useMemo(() => {
    const lista = [...(disponiveis.dados ?? [])]
    if (ordenacao === 'disponivel') lista.sort((a, b) => b.disponivelCentral - a.disponivelCentral)
    if (ordenacao === 'loja') lista.sort((a, b) => a.naLoja - b.naLoja)
    return lista
  }, [disponiveis.dados, ordenacao])


  const adicionar = (produto: ProdutoDisponivel) => {
    if (carrinho.some((i) => i.produtoId === produto.produtoId)) {
      toast.aviso('Produto já selecionado', produto.nome)
      return
    }
    setCarrinho((atual) => [
      ...atual,
      {
        produtoId: produto.produtoId,
        nome: produto.nome,
        imagem: produto.imagem,
        quantidade: Math.min(12, produto.disponivelCentral),
        disponivel: produto.disponivelCentral,
      },
    ])
  }

  const atualizarItem = (produtoId: string, mudanca: Partial<ItemCarrinho>) => {
    setCarrinho((atual) =>
      atual.map((i) => (i.produtoId === produtoId ? { ...i, ...mudanca } : i)),
    )
  }

  const totais = useMemo(
    () => ({
      produtos: carrinho.length,
      itens: carrinho.reduce((acc, i) => acc + i.quantidade, 0),
    }),
    [carrinho],
  )

  const confirmar = async () => {
    setConfirmando(true)
    try {
      const resultado = await AbastecimentoService.confirmar(
        carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      )

      toast.sucesso(
        'Abastecimento confirmado',
        `${resultado.abastecimento.totalItens} itens transferidos para a loja. Estoque total permanece em ${numero(resultado.totalGlobalDepois)} un.`,
      )
      setCarrinho([])
      disponiveis.recarregar()
      recentes.recarregar()
      cabecalho.recarregar()
    } catch (e) {
      toast.erro('Não foi possível confirmar', (e as Error).message)
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Abastecer loja"
        descricao="Selecione os produtos do estoque central para abastecer a loja. Abastecer é uma transferência: o estoque total não muda."
      />

      {/* ------------------------ origem → destino ------------------------ */}
      <div className="mc-card flex flex-wrap items-center gap-6 p-5">
        <div className="flex min-w-[220px] items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal"
            aria-hidden
          >
            <Warehouse className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-caption text-muted">Origem</p>
            <p className="font-display text-card-title font-semibold text-ink">
              {cabecalho.dados?.origemNome ?? 'Estoque central'}
            </p>
            <p className="text-caption text-muted">
              {numero(cabecalho.dados?.itensDisponiveis ?? 0)} itens disponíveis
            </p>
          </div>
        </div>

        <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted sm:block" strokeWidth={1.75} />

        <div className="flex min-w-[220px] items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-success-50 text-success"
            aria-hidden
          >
            <Store className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-caption text-muted">Destino</p>
            <p className="font-display text-card-title font-semibold text-ink">
              {cabecalho.dados?.destinoNome ?? 'Mercadinho - Térreo'}
            </p>
            <p className="text-caption text-muted">
              {numero(cabecalho.dados?.itensNaLoja ?? 0)} itens hoje na loja
            </p>
          </div>
        </div>

      </div>

      {/* ------------------------ duas caixas ------------------------ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)]">
        <SectionCard
          titulo="Produtos disponíveis no estoque central"
          semPaddingCorpo
          rodape={
            <p className="px-5 py-3 text-caption text-muted">
              Mostrando {Math.min(ordenados.length, 8)} de {ordenados.length} produtos
            </p>
          }
        >
          <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
            <SearchInput
              valor={busca}
              aoMudar={setBusca}
              placeholder="Buscar produto..."
              className="min-w-[200px] flex-1"
            />
            <Select
              className="h-11 w-[170px]"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as typeof ordenacao)}
              opcoes={[
                { valor: 'nome', label: 'Ordenar: A-Z' },
                { valor: 'disponivel', label: 'Maior estoque' },
                { valor: 'loja', label: 'Menor na loja' },
              ]}
            />
          </div>

          {disponiveis.carregando ? (
            <div className="space-y-3 px-5 pb-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : ordenados.length === 0 ? (
            <EmptyState
              icone={<Boxes className="h-7 w-7" strokeWidth={1.5} />}
              titulo="Nenhum produto disponível"
              descricao="O estoque central não possui saldo para abastecer a loja. Registre uma compra primeiro."
              acao={
                <Button variante="outline" onClick={() => navegar('/operacao/compras/nova')}>
                  Nova compra
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="mc-table-head">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Estoque disponível</th>
                    <th className="px-4 py-3 font-medium">Na loja</th>
                    <th className="w-[70px] px-4 py-3 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.slice(0, 8).map((produto) => {
                    const jaNoCarrinho = carrinho.some((i) => i.produtoId === produto.produtoId)
                    return (
                      <tr
                        key={produto.produtoId}
                        className="border-b border-line last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ProductAvatar imagem={produto.imagem} tamanho="sm" />
                            <span className="truncate text-body text-ink">{produto.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-body text-muted">{produto.categoriaNome}</td>
                        <td className="px-4 py-3 text-body font-medium tabular text-success">
                          {numero(produto.disponivelCentral)}
                        </td>
                        <td className="px-4 py-3 text-body tabular text-muted">
                          {numero(produto.naLoja)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`Adicionar ${produto.nome}`}
                            disabled={jaNoCarrinho}
                            onClick={() => adicionar(produto)}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                              jaNoCarrinho
                                ? 'cursor-not-allowed bg-surface-2 text-muted'
                                : 'bg-teal text-white hover:bg-teal-dark',
                            )}
                          >
                            {jaNoCarrinho ? (
                              <CircleCheck className="h-4 w-4" strokeWidth={2} />
                            ) : (
                              <Plus className="h-4 w-4" strokeWidth={2.25} />
                            )}
                          </button>
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
          titulo="Itens selecionados para abastecimento"
          acoes={
            carrinho.length > 0 ? (
              <Button variante="danger-outline" tamanho="sm" onClick={() => setCarrinho([])}>
                Limpar todos
              </Button>
            ) : undefined
          }
          semPaddingCorpo
        >
          {carrinho.length === 0 ? (
            <EmptyState
              icone={<Truck className="h-7 w-7" strokeWidth={1.5} />}
              titulo="Nenhum item selecionado"
              descricao="Adicione produtos da lista ao lado para montar o abastecimento da loja."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="mc-table-head">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="w-[128px] px-4 py-3 font-medium">Qtd.</th>
                    <th className="w-[52px] px-3 py-3 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {carrinho.map((item) => (
                    <tr key={item.produtoId} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <ProductAvatar imagem={item.imagem} tamanho="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-body text-ink">{item.nome}</span>
                            <span className="block text-caption tabular text-muted">
                              disponível: {numero(item.disponivel)}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-3">
                        <Contador
                          valor={item.quantidade}
                          maximo={item.disponivel}
                          aoMudar={(v) => atualizarItem(item.produtoId, { quantidade: v })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label={`Remover ${item.nome}`}
                          onClick={() =>
                            setCarrinho((atual) =>
                              atual.filter((i) => i.produtoId !== item.produtoId),
                            )
                          }
                          className="rounded-md p-2 text-muted transition-colors hover:bg-danger-50 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ------------------------ resumo + confirmação ------------------------ */}
      <SectionCard titulo="Resumo do abastecimento" classeCorpo="pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoItem
              icone={<Warehouse className="h-4.5 w-4.5" strokeWidth={1.75} />}
              tom="teal"
              valor={numero(totais.produtos)}
              rotulo="Total de produtos"
              auxiliar="produtos selecionados"
            />
            <ResumoItem
              icone={<Boxes className="h-4.5 w-4.5" strokeWidth={1.75} />}
              tom="info"
              valor={numero(totais.itens)}
              rotulo="Total de itens"
              auxiliar="unidades no total"
            />
          </div>

          <div className="w-full shrink-0 xl:w-[280px]">
            <Button
              blocoCompleto
              tamanho="lg"
              iconeEsquerda={<CircleCheck className="h-4.5 w-4.5" strokeWidth={2} />}
              disabled={carrinho.length === 0}
              carregando={confirmando}
              onClick={() => void confirmar()}
            >
              Confirmar abastecimento
            </Button>
            <p className="mt-2.5 flex items-start gap-2 text-caption text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} />
              Esta operação será registrada como transferência e poderá ser rastreada em
              Movimentações.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------ abastecimentos recentes ------------------------ */}
      <SectionCard titulo="Abastecimentos recentes" semPaddingCorpo>
        {recentes.carregando ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : recentes.dados && recentes.dados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="mc-table-head">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                  <th className="px-4 py-3 font-medium">Produtos</th>
                  <th className="px-4 py-3 font-medium">Itens</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="w-[70px] px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentes.dados.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-body tabular text-ink">#{a.numero}</td>
                    <td className="px-4 py-3 text-body text-muted">{a.destinoNome}</td>
                    <td className="px-4 py-3 text-body tabular text-muted">{a.totalProdutos}</td>
                    <td className="px-4 py-3 text-body tabular text-muted">{a.totalItens}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-body tabular text-muted">{dataHora(a.data)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Ver abastecimento ${a.numero}`}
                        onClick={() => navegar('/operacao/movimentacoes')}
                        className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icone={<ArrowDownUp className="h-7 w-7" strokeWidth={1.5} />}
            titulo="Nenhum abastecimento realizado"
            descricao="Os abastecimentos confirmados nesta sessão aparecem aqui."
          />
        )}
      </SectionCard>
    </PageContainer>
  )
}

function ResumoItem({
  icone,
  tom,
  valor,
  rotulo,
  auxiliar,
}: {
  icone: React.ReactNode
  tom: 'teal' | 'info' | 'success' | 'danger'
  valor: string
  rotulo: string
  auxiliar: string
}) {
  const fundos = {
    teal: 'bg-teal-50 text-teal',
    info: 'bg-info-50 text-info',
    success: 'bg-success-50 text-success',
    danger: 'bg-danger-50 text-danger',
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line p-3.5">
      <span
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', fundos[tom])}
        aria-hidden
      >
        {icone}
      </span>
      <div className="min-w-0">
        <p className="truncate text-caption text-muted">{rotulo}</p>
        <p className="mt-0.5 font-display text-section-title font-semibold tabular text-ink">
          {valor}
        </p>
        <p className="truncate text-caption text-muted">{auxiliar}</p>
      </div>
    </div>
  )
}
