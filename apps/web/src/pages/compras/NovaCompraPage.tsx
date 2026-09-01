import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  CircleAlert,
  Info,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react'
import type { FormaPagamento, ProdutoListItem, UnidadeMedida } from '@/models'
import { CompraService, EstoqueService, FornecedorService, ProdutoService } from '@/services'
import type { ItemCompraEntrada } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { moeda, paraNumero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState } from '@/components/ui/Feedback'
import { FormField, Input, SearchInput, Select, Textarea } from '@/components/ui/Form'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { ProductAvatar, Stepper } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

const etapas = [
  { numero: 1, titulo: 'Fornecedor', descricao: 'Selecione o fornecedor e os dados da compra' },
  { numero: 2, titulo: 'Itens', descricao: 'Adicione os produtos da compra' },
  { numero: 3, titulo: 'Recebimento', descricao: 'Defina o recebimento e o destino' },
  { numero: 4, titulo: 'Confirmação', descricao: 'Revise e confirme a entrada' },
]

const formasPagamento: Array<{ valor: FormaPagamento; label: string }> = [
  { valor: 'boleto', label: 'Boleto bancário' },
  { valor: 'pix', label: 'PIX' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'cartao', label: 'Cartão' },
  { valor: 'prazo', label: 'A prazo' },
]

const condicoes = ['À vista', '7 dias', '15 dias', '21 dias', '30 dias', '45 dias']

interface ItemFormulario {
  chave: string
  produtoId: string
  nome: string
  imagem: string
  quantidade: string
  unidade: UnidadeMedida
  custoUnitario: string
  validade: string
  lote: string
}

function hojeISO(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

export function NovaCompraPage() {
  const navegar = useNavigate()
  const toast = useToast()

  const [fornecedorId, setFornecedorId] = useState('')
  const [notaFiscal, setNotaFiscal] = useState('')
  const [dataEmissao, setDataEmissao] = useState(hojeISO())
  const [dataEntrada, setDataEntrada] = useState(hojeISO())
  const [condicaoPagamento, setCondicaoPagamento] = useState('30 dias')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('boleto')
  const [dataVencimento, setDataVencimento] = useState(hojeISO(30))
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ItemFormulario[]>([])
  const [frete, setFrete] = useState('0,00')
  const [desconto, setDesconto] = useState('0,00')
  const [localDestinoId, setLocalDestinoId] = useState('')
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const fornecedores = useRecurso(() => FornecedorService.listarSimples(), [])
  const produtos = useRecurso(() => ProdutoService.listarSimples(), [])
  const locais = useRecurso(async () => {
    const lista = await EstoqueService.locais()
    const central = lista.find((l) => l.tipo === 'central')
    if (central) setLocalDestinoId((atual) => atual || central.id)
    return lista
  }, [])

  const subtotal = useMemo(
    () =>
      itens.reduce(
        (acc, i) => acc + paraNumero(i.quantidade) * paraNumero(i.custoUnitario),
        0,
      ),
    [itens],
  )
  const total = subtotal + paraNumero(frete) - paraNumero(desconto)

  const dadosOk = Boolean(fornecedorId)
  const itensOk =
    itens.length > 0 &&
    itens.every((i) => paraNumero(i.quantidade) > 0 && paraNumero(i.custoUnitario) > 0)
  const recebimentoOk = Boolean(localDestinoId && dataEntrada)
  const etapaAtual = !dadosOk ? 1 : !itensOk ? 2 : !recebimentoOk ? 3 : 4

  const adicionarProduto = (produto: ProdutoListItem) => {
    if (itens.some((i) => i.produtoId === produto.id)) {
      toast.aviso('Produto já adicionado', produto.nome)
      return
    }
    const validadeSugerida = produto.validadePadraoDias
      ? hojeISO(produto.validadePadraoDias)
      : ''
    setItens((atuais) => [
      ...atuais,
      {
        chave: `${produto.id}-${atuais.length}`,
        produtoId: produto.id,
        nome: produto.nome,
        imagem: produto.imagem,
        quantidade: '1',
        unidade: produto.unidade,
        custoUnitario:
          produto.custoMedio !== null
            ? produto.custoMedio.toFixed(2).replace('.', ',')
            : (produto.precoSugerido * 0.7).toFixed(2).replace('.', ','),
        validade: validadeSugerida,
        lote: '',
      },
    ])
  }

  const atualizarItem = (chave: string, campo: keyof ItemFormulario, valor: string) => {
    setItens((atuais) =>
      atuais.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)),
    )
  }

  const confirmar = async () => {
    setSalvando(true)
    try {
      const entrada: ItemCompraEntrada[] = itens.map((i) => ({
        produtoId: i.produtoId,
        quantidade: paraNumero(i.quantidade),
        unidade: i.unidade,
        custoUnitario: paraNumero(i.custoUnitario),
        validade: i.validade || null,
        lote: i.lote,
      }))

      const resultado = await CompraService.confirmar({
        fornecedorId,
        notaFiscal,
        dataEmissao,
        dataEntrada,
        condicaoPagamento,
        formaPagamento,
        dataVencimento,
        observacoes,
        itens: entrada,
        frete: paraNumero(frete),
        desconto: paraNumero(desconto),
        localDestinoId,
      })

      toast.sucesso(
        'Entrada confirmada',
        `${resultado.itensAdicionados} itens em ${resultado.lotesCriados} ${
          resultado.lotesCriados === 1 ? 'lote' : 'lotes'
        } foram adicionados ao estoque central.`,
      )
      navegar('/operacao/estoque-central')
    } catch (e) {
      toast.erro('Não foi possível confirmar a entrada', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Nova compra"
        descricao="Preencha as informações da compra e confirme a entrada dos produtos no estoque."
      />

      <div className="mc-card px-6 py-6">
        <Stepper etapas={etapas} atual={etapaAtual} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---------------------------- Dados da compra --------------------------- */}
          <SectionCard titulo="Dados da compra" classeCorpo="pt-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Fornecedor" obrigatorio htmlFor="fornecedor">
                <Select
                  id="fornecedor"
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  placeholder="Buscar fornecedor..."
                  opcoes={(fornecedores.dados ?? []).map((f) => ({ valor: f.id, label: f.nome }))}
                />
              </FormField>
              <FormField label="Nota fiscal" htmlFor="nf">
                <Input
                  id="nf"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  placeholder="Opcional"
                />
              </FormField>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
              <FormField label="Data de emissão" obrigatorio htmlFor="emissao">
                <Input
                  id="emissao"
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                />
              </FormField>
              <FormField label="Data de entrada" obrigatorio htmlFor="entrada">
                <Input
                  id="entrada"
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                />
              </FormField>
              <FormField label="Condição de pagamento" htmlFor="condicao">
                <Select
                  id="condicao"
                  value={condicaoPagamento}
                  onChange={(e) => setCondicaoPagamento(e.target.value)}
                  opcoes={condicoes.map((c) => ({ valor: c, label: c }))}
                />
              </FormField>
              <FormField label="Forma de pagamento" htmlFor="forma">
                <Select
                  id="forma"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                  opcoes={formasPagamento.map((f) => ({ valor: f.valor, label: f.label }))}
                />
              </FormField>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <FormField label="Data de vencimento" obrigatorio htmlFor="vencimento">
                <Input
                  id="vencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </FormField>
              <FormField label="Observações" htmlFor="obs">
                <Textarea
                  id="obs"
                  className="min-h-[44px]"
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre esta compra (opcional)"
                />
              </FormField>
            </div>
          </SectionCard>

          {/* ---------------------------- Itens da compra --------------------------- */}
          <SectionCard
            titulo="Itens da compra"
            acoes={
              <Button
                variante="outline"
                tamanho="sm"
                iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
                onClick={() => setSeletorAberto(true)}
              >
                Adicionar produto
              </Button>
            }
            semPaddingCorpo
            rodape={
              itens.length > 0 ? (
                <p className="px-5 py-3 text-caption text-muted">
                  Exibindo {itens.length} de {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </p>
              ) : undefined
            }
          >
            {itens.length === 0 ? (
              <EmptyState
                icone={<Truck className="h-7 w-7" strokeWidth={1.5} />}
                titulo="Nenhum item adicionado"
                descricao="Adicione os produtos que estão chegando nesta nota fiscal."
                acao={
                  <Button
                    iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
                    onClick={() => setSeletorAberto(true)}
                  >
                    Adicionar produto
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="mc-table-head">
                      <th className="px-4 py-3 font-medium">Produto</th>
                      <th className="w-[110px] px-4 py-3 font-medium">Quantidade</th>
                      <th className="w-[110px] px-4 py-3 font-medium">Unidade</th>
                      <th className="w-[130px] px-4 py-3 font-medium">Custo unitário</th>
                      <th className="w-[150px] px-4 py-3 font-medium">Validade</th>
                      <th className="w-[120px] px-4 py-3 font-medium">Lote</th>
                      <th className="w-[110px] px-4 py-3 text-right font-medium">Total</th>
                      <th className="w-[56px] px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const totalItem =
                        paraNumero(item.quantidade) * paraNumero(item.custoUnitario)
                      return (
                        <tr key={item.chave} className="border-b border-line last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <ProductAvatar imagem={item.imagem} tamanho="sm" />
                              <span className="truncate text-body text-ink">{item.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              className="h-10"
                              value={item.quantidade}
                              inputMode="numeric"
                              onChange={(e) =>
                                atualizarItem(item.chave, 'quantidade', e.target.value)
                              }
                              aria-label={`Quantidade de ${item.nome}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              className="h-10"
                              value={item.unidade}
                              onChange={(e) => atualizarItem(item.chave, 'unidade', e.target.value)}
                              opcoes={['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'fd'].map((u) => ({
                                valor: u,
                                label: u,
                              }))}
                              aria-label={`Unidade de ${item.nome}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              className="h-10"
                              value={item.custoUnitario}
                              inputMode="decimal"
                              onChange={(e) =>
                                atualizarItem(item.chave, 'custoUnitario', e.target.value)
                              }
                              aria-label={`Custo unitário de ${item.nome}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              className="h-10"
                              type="date"
                              value={item.validade}
                              onChange={(e) =>
                                atualizarItem(item.chave, 'validade', e.target.value)
                              }
                              aria-label={`Validade de ${item.nome}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              className="h-10"
                              value={item.lote}
                              placeholder="Auto"
                              onChange={(e) => atualizarItem(item.chave, 'lote', e.target.value)}
                              aria-label={`Lote de ${item.nome}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-body font-medium tabular text-ink">
                            {moeda(totalItem)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              aria-label={`Remover ${item.nome}`}
                              onClick={() =>
                                setItens((atuais) =>
                                  atuais.filter((i) => i.chave !== item.chave),
                                )
                              }
                              className="rounded-md p-2 text-muted transition-colors hover:bg-danger-50 hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
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

          <div className="mc-card flex flex-wrap items-center justify-between gap-3 p-4">
            <Button
              variante="danger-outline"
              iconeEsquerda={<Trash2 className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() => setConfirmarCancelar(true)}
            >
              Cancelar compra
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button
                variante="outline"
                iconeEsquerda={<Save className="h-4 w-4" strokeWidth={1.75} />}
                onClick={() =>
                  toast.info(
                    'Rascunho salvo localmente',
                    'A persistência definitiva virá com a API.',
                  )
                }
              >
                Salvar rascunho
              </Button>
              <Button
                iconeEsquerda={<Check className="h-4 w-4" strokeWidth={2} />}
                disabled={etapaAtual < 4}
                carregando={salvando}
                onClick={() => void confirmar()}
              >
                Confirmar entrada
              </Button>
            </div>
          </div>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard titulo="Resumo da compra" classeCorpo="pt-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-body text-muted">Subtotal dos itens</span>
              <span className="text-body font-medium tabular text-ink">{moeda(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-1.5 text-body text-muted">
                Frete
                <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <Input
                className="h-10 w-28 text-right"
                value={frete}
                inputMode="decimal"
                onChange={(e) => setFrete(e.target.value)}
                aria-label="Frete"
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-1.5 text-body text-muted">
                Desconto
                <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <Input
                className="h-10 w-28 text-right"
                value={desconto}
                inputMode="decimal"
                onChange={(e) => setDesconto(e.target.value)}
                aria-label="Desconto"
              />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
              <span className="text-body font-medium text-ink">Total da compra</span>
              <span className="font-display text-[19px] font-semibold tabular text-teal">
                {moeda(total)}
              </span>
            </div>
          </SectionCard>

          <SectionCard classeCorpo="p-5">
            <FormField
              label="Destino da entrada"
              obrigatorio
              helper="Local onde os produtos serão armazenados."
              htmlFor="destino"
            >
              <Select
                id="destino"
                value={localDestinoId}
                onChange={(e) => setLocalDestinoId(e.target.value)}
                opcoes={(locais.dados ?? [])
                  .filter((l) => l.tipo === 'central')
                  .map((l) => ({ valor: l.id, label: l.nome }))}
              />
            </FormField>
            <p className="mt-3 flex items-center gap-2 text-caption text-muted">
              <Warehouse className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Toda compra entra pelo estoque central. A loja é abastecida por transferência.
            </p>
          </SectionCard>

          <Alert
            tom="info"
            titulo="Importante"
            icone={<CircleAlert className="h-5 w-5" strokeWidth={1.75} />}
          >
            Após confirmar a entrada, os itens serão adicionados ao estoque selecionado, os lotes
            serão criados e o custo médio dos produtos será recalculado. Esta compra não poderá ser
            alterada.
          </Alert>
        </aside>
      </div>

      <SeletorProduto
        aberto={seletorAberto}
        aoFechar={() => setSeletorAberto(false)}
        produtos={produtos.dados ?? []}
        jaAdicionados={itens.map((i) => i.produtoId)}
        aoSelecionar={(p) => {
          adicionarProduto(p)
          setSeletorAberto(false)
        }}
      />

      <ConfirmDialog
        aberto={confirmarCancelar}
        aoFechar={() => setConfirmarCancelar(false)}
        aoConfirmar={() => navegar('/operacao/compras')}
        titulo="Cancelar compra"
        descricao="Todos os dados preenchidos serão descartados e nenhuma entrada será registrada no estoque."
        rotuloConfirmar="Descartar compra"
        rotuloCancelar="Continuar editando"
        destrutivo
      />
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */

function SeletorProduto({
  aberto,
  aoFechar,
  produtos,
  jaAdicionados,
  aoSelecionar,
}: {
  aberto: boolean
  aoFechar: () => void
  produtos: ProdutoListItem[]
  jaAdicionados: string[]
  aoSelecionar: (produto: ProdutoListItem) => void
}) {
  const [busca, setBusca] = useState('')

  const filtrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.ean.includes(busca.replace(/\D/g, '')),
  )

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Adicionar produto"
      descricao="Selecione o produto que está entrando nesta nota fiscal."
      larguraMaxima="max-w-xl"
    >
      <SearchInput valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou EAN..." autoFocus />

      <div className="mt-4 max-h-[380px] overflow-y-auto">
        {filtrados.length === 0 ? (
          <EmptyState
            compacto
            icone={<Search className="h-5 w-5" strokeWidth={1.5} />}
            titulo="Nenhum produto encontrado"
            descricao="Verifique a busca ou cadastre o produto antes de comprá-lo."
          />
        ) : (
          <ul className="space-y-1">
            {filtrados.map((produto) => {
              const adicionado = jaAdicionados.includes(produto.id)
              return (
                <li key={produto.id}>
                  <button
                    type="button"
                    disabled={adicionado}
                    onClick={() => aoSelecionar(produto)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors',
                      adicionado
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:border-teal-100 hover:bg-teal-50',
                    )}
                  >
                    <ProductAvatar imagem={produto.imagem} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-ink">{produto.nome}</span>
                      <span className="block truncate text-caption text-muted">
                        {produto.categoriaNome} · {produto.ean || 'sem EAN'}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption tabular text-muted">
                      {produto.estoqueTotal} un
                    </span>
                    {adicionado ? (
                      <Check className="h-4 w-4 shrink-0 text-teal" strokeWidth={2} />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
