import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleCheck, ImagePlus, Lightbulb, Package, Store, Tags } from 'lucide-react'
import type { ControleValidade, UnidadeMedida } from '@/models'
import { FornecedorService, ProdutoService } from '@/services'
import type { EntradaConfiguracaoLoja, EntradaProduto } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { moeda, paraNumero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'
import { DialogoCatalogo } from './DialogoCatalogo'

const unidades: Array<{ valor: UnidadeMedida; label: string }> = [
  { valor: 'un', label: 'Unidade (un)' },
  { valor: 'kg', label: 'Quilograma (kg)' },
  { valor: 'g', label: 'Grama (g)' },
  { valor: 'l', label: 'Litro (L)' },
  { valor: 'ml', label: 'Mililitro (ml)' },
  { valor: 'cx', label: 'Caixa (cx)' },
  { valor: 'pct', label: 'Pacote (pct)' },
  { valor: 'fd', label: 'Fardo (fd)' },
]

const emojisSugeridos = ['📦', '🥤', '🍞', '🥛', '🧀', '🍫', '🧴', '🍚', '🧼', '🥫', '🍪', '🧻']

/**
 * Campos do catálogo. Alguns não têm UI nesta fase (ponto de compra, controle
 * de validade, localização no central): ficam no estado para serem preservados
 * na edição e para alimentar as regras que já dependem deles.
 */
interface FormularioProduto {
  nome: string
  categoriaId: string
  marcaId: string
  ean: string
  unidade: UnidadeMedida
  conteudo: string
  sku: string
  fornecedorPrincipalId: string
  observacoes: string
  imagem: string
  pontoCompra: number
  estoqueMaximoCentral: number
  controleValidade: ControleValidade
  validadePadraoDias: number | null
  localizacaoPadrao: string
}

const formularioVazio: FormularioProduto = {
  nome: '',
  categoriaId: '',
  marcaId: '',
  ean: '',
  unidade: 'un',
  conteudo: '',
  sku: '',
  fornecedorPrincipalId: '',
  observacoes: '',
  imagem: '📦',
  pontoCompra: 0,
  estoqueMaximoCentral: 0,
  controleValidade: 'nao-controlar',
  validadePadraoDias: null,
  localizacaoPadrao: '',
}

/** Linha editável de configuração por loja. */
interface LinhaLoja extends EntradaConfiguracaoLoja {
  lojaNome: string
  precoTexto: string
}

const dicas = [
  'Use nomes claros e objetivos para facilitar a busca.',
  'Preencha o código de barras (EAN) para agilizar as operações.',
  'O preço de venda é definido por loja — cada ponto pode praticar o seu.',
  'O estoque só entra pela tela de Compras — nunca pelo cadastro.',
]

export function ProdutoFormPage({ modo }: { modo: 'novo' | 'edicao' }) {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<FormularioProduto>(formularioVazio)
  const [lojas, setLojas] = useState<LinhaLoja[]>([])
  const [erros, setErros] = useState<Partial<Record<keyof FormularioProduto, string>>>({})
  const [salvando, setSalvando] = useState(false)
  const [criando, setCriando] = useState<'categoria' | 'marca' | null>(null)
  const [estoqueCentral, setEstoqueCentral] = useState(0)

  const categorias = useRecurso(() => ProdutoService.categorias(), [])
  const marcas = useRecurso(() => ProdutoService.marcas(), [])
  const fornecedores = useRecurso(() => FornecedorService.listarSimples(), [])
  const existente = useRecurso(
    async () => (modo === 'edicao' && id ? ProdutoService.obter(id) : null),
    [modo, id],
  )
  const configuracoes = useRecurso(
    () => ProdutoService.configuracoesPorLoja(modo === 'edicao' ? id : undefined),
    [modo, id],
  )

  useEffect(() => {
    const p = existente.dados
    if (!p) return
    setForm({
      nome: p.nome,
      categoriaId: p.categoriaId,
      marcaId: p.marcaId ?? '',
      ean: p.ean,
      unidade: p.unidade,
      conteudo: p.conteudo,
      sku: p.sku,
      fornecedorPrincipalId: p.fornecedorPrincipalId ?? '',
      observacoes: p.observacoes,
      imagem: p.imagem,
      // Preservados sem UI nesta fase.
      pontoCompra: p.pontoCompra,
      estoqueMaximoCentral: p.estoqueMaximoCentral,
      controleValidade: p.controleValidade,
      validadePadraoDias: p.validadePadraoDias,
      localizacaoPadrao: p.localizacaoPadrao,
    })
    setEstoqueCentral(p.estoqueCentral)
  }, [existente.dados])

  useEffect(() => {
    if (!configuracoes.dados) return
    setLojas(
      configuracoes.dados.map((c) => ({
        lojaId: c.lojaId,
        lojaNome: c.lojaNome,
        precoVenda: c.precoVenda,
        precoTexto: c.precoVenda > 0 ? c.precoVenda.toFixed(2).replace('.', ',') : '',
        estoqueMinimo: c.estoqueMinimo,
        estoqueIdeal: c.estoqueIdeal,
        ativo: c.ativo,
      })),
    )
  }, [configuracoes.dados])

  const atualizar = <K extends keyof FormularioProduto>(campo: K, valor: FormularioProduto[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const atualizarLoja = (lojaId: string, mudanca: Partial<LinhaLoja>) => {
    setLojas((atuais) => atuais.map((l) => (l.lojaId === lojaId ? { ...l, ...mudanca } : l)))
  }

  const validar = (): boolean => {
    const novos: Partial<Record<keyof FormularioProduto, string>> = {}
    if (!form.nome.trim()) novos.nome = 'Informe o nome do produto.'
    if (!form.categoriaId) novos.categoriaId = 'Selecione uma categoria.'
    if (form.ean && form.ean.replace(/\D/g, '').length < 8)
      novos.ean = 'O EAN deve ter ao menos 8 dígitos.'
    setErros(novos)
    if (Object.keys(novos).length > 0) {
      toast.aviso('Revise o formulário', 'Alguns campos obrigatórios precisam de atenção.')
      return false
    }

    const ativas = lojas.filter((l) => l.ativo)
    if (ativas.length === 0) {
      toast.aviso('Nenhuma loja ativa', 'Ative o produto em ao menos uma loja para vendê-lo.')
      return false
    }
    const semPreco = ativas.find((l) => l.precoVenda <= 0)
    if (semPreco) {
      toast.aviso('Preço faltando', `Informe o preço de venda em "${semPreco.lojaNome}".`)
      return false
    }
    return true
  }

  const montarEntrada = (): EntradaProduto => ({
    nome: form.nome,
    ean: form.ean,
    sku: form.sku,
    categoriaId: form.categoriaId,
    marcaId: form.marcaId || null,
    unidade: form.unidade,
    conteudo: form.conteudo,
    // Sem campo próprio: vale como referência o preço da primeira loja que vende.
    precoSugerido: lojas.find((l) => l.ativo && l.precoVenda > 0)?.precoVenda ?? 0,
    pontoCompra: form.pontoCompra,
    estoqueMaximoCentral: form.estoqueMaximoCentral,
    controleValidade: form.controleValidade,
    validadePadraoDias: form.validadePadraoDias,
    localizacaoPadrao: form.localizacaoPadrao,
    fornecedorPrincipalId: form.fornecedorPrincipalId || null,
    observacoes: form.observacoes,
    imagem: form.imagem,
    configuracoesLoja: lojas.map<EntradaConfiguracaoLoja>((l) => ({
      lojaId: l.lojaId,
      precoVenda: l.precoVenda,
      estoqueMinimo: l.estoqueMinimo,
      estoqueIdeal: l.estoqueIdeal,
      ativo: l.ativo,
    })),
  })

  const salvar = async (continuar: boolean) => {
    if (!validar()) return
    setSalvando(true)
    try {
      if (modo === 'edicao' && id) {
        const p = await ProdutoService.atualizar(id, montarEntrada())
        toast.sucesso('Produto atualizado', p.nome)
        navegar('/cadastros/produtos')
        return
      }

      const p = await ProdutoService.criar(montarEntrada())
      toast.sucesso(
        'Produto cadastrado',
        `${p.nome} foi criado com estoque 0. Registre uma compra para dar entrada.`,
      )
      if (continuar) {
        setForm(formularioVazio)
        setErros({})
        configuracoes.recarregar()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        navegar('/cadastros/produtos')
      }
    } catch (e) {
      toast.erro('Não foi possível salvar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const categoriaSelecionada = categorias.dados?.find((c) => c.id === form.categoriaId)
  const marcaSelecionada = marcas.dados?.find((m) => m.id === form.marcaId)
  const lojaPrincipal = lojas[0]

  return (
    <PageContainer>
      <PageHeader
        migalhas={[
          { label: 'Cadastros' },
          { label: 'Produtos', to: '/cadastros/produtos' },
          { label: modo === 'novo' ? 'Cadastrar produto' : 'Editar produto' },
        ]}
        titulo={modo === 'novo' ? 'Cadastrar produto' : 'Editar produto'}
        descricao={
          modo === 'novo'
            ? 'Preencha as informações abaixo para cadastrar um novo produto no sistema.'
            : 'Atualize as informações do produto. O estoque continua sendo controlado pelas operações.'
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ------------------------ Informações principais ------------------------ */}
          <SectionCard
            icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Informações principais"
            descricao="O que o produto é. Não muda entre lojas."
            classeCorpo="grid grid-cols-1 gap-5 pt-5 md:grid-cols-3"
          >
            <FormField label="Nome do produto" obrigatorio erro={erros.nome} htmlFor="nome">
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => atualizar('nome', e.target.value)}
                placeholder="Digite o nome do produto"
                erro={Boolean(erros.nome)}
              />
            </FormField>

            <FormField
              label="Categoria"
              obrigatorio
              erro={erros.categoriaId}
              htmlFor="categoria"
              acessorio={
                <button
                  type="button"
                  onClick={() => setCriando('categoria')}
                  className="rounded text-caption font-medium text-teal transition-colors hover:text-teal-dark mc-focus"
                >
                  + Nova
                </button>
              }
            >
              <Select
                id="categoria"
                value={form.categoriaId}
                onChange={(e) => atualizar('categoriaId', e.target.value)}
                placeholder="Selecione uma categoria"
                erro={Boolean(erros.categoriaId)}
                opcoes={(categorias.dados ?? []).map((c) => ({ valor: c.id, label: c.nome }))}
              />
            </FormField>

            <FormField
              label="Marca"
              htmlFor="marca"
              acessorio={
                <button
                  type="button"
                  onClick={() => setCriando('marca')}
                  className="rounded text-caption font-medium text-teal transition-colors hover:text-teal-dark mc-focus"
                >
                  + Nova
                </button>
              }
            >
              <Select
                id="marca"
                value={form.marcaId}
                onChange={(e) => atualizar('marcaId', e.target.value)}
                placeholder="Selecione uma marca"
                opcoes={(marcas.dados ?? []).map((m) => ({ valor: m.id, label: m.nome }))}
              />
            </FormField>

            <FormField label="EAN (código de barras)" erro={erros.ean} htmlFor="ean">
              <Input
                id="ean"
                value={form.ean}
                onChange={(e) => atualizar('ean', e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="7891234567890"
                inputMode="numeric"
                erro={Boolean(erros.ean)}
              />
            </FormField>

            <FormField label="Unidade de medida" obrigatorio htmlFor="unidade">
              <Select
                id="unidade"
                value={form.unidade}
                onChange={(e) => atualizar('unidade', e.target.value as UnidadeMedida)}
                opcoes={unidades.map((u) => ({ valor: u.valor, label: u.label }))}
              />
            </FormField>

            <FormField label="Conteúdo / Volume" htmlFor="conteudo">
              <Input
                id="conteudo"
                value={form.conteudo}
                onChange={(e) => atualizar('conteudo', e.target.value)}
                placeholder="Ex.: 1L, 500g, 2kg"
              />
            </FormField>
          </SectionCard>

          {/* ---------------------- Preço e reposição por loja ---------------------- */}
          <SectionCard
            icone={<Store className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Preço e reposição por loja"
            descricao="Cada loja pode praticar o seu preço. O mínimo indica quando a prateleira precisa ser reabastecida."
            semPaddingCorpo
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="mc-table-head">
                    <th className="px-5 py-3 font-medium">Loja</th>
                    <th className="w-[96px] px-4 py-3 font-medium">Vende</th>
                    <th className="w-[160px] px-4 py-3 font-medium">Preço (R$)</th>
                    <th className="w-[160px] px-4 py-3 font-medium">Mín. loja</th>
                  </tr>
                </thead>
                <tbody>
                  {lojas.map((loja) => (
                    <tr key={loja.lojaId} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <span className="text-body font-medium text-ink">{loja.lojaNome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle
                          ativo={loja.ativo}
                          aoMudar={(v) => atualizarLoja(loja.lojaId, { ativo: v })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          className="h-10"
                          value={loja.precoTexto}
                          inputMode="decimal"
                          disabled={!loja.ativo}
                          placeholder="0,00"
                          aria-label={`Preço de venda em ${loja.lojaNome}`}
                          onChange={(e) =>
                            atualizarLoja(loja.lojaId, {
                              precoTexto: e.target.value,
                              precoVenda: paraNumero(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          className="h-10"
                          type="number"
                          min={0}
                          value={loja.estoqueMinimo}
                          disabled={!loja.ativo}
                          aria-label={`Estoque mínimo em ${loja.lojaNome}`}
                          onChange={(e) =>
                            atualizarLoja(loja.lojaId, {
                              estoqueMinimo: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ----------------------------- Identificação ---------------------------- */}
          <SectionCard
            icone={<Tags className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Identificação"
            classeCorpo="grid grid-cols-1 gap-5 pt-5 md:grid-cols-3"
          >
            <FormField label="Código interno (SKU)" htmlFor="sku">
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => atualizar('sku', e.target.value)}
                placeholder="Ex.: PROD001"
              />
            </FormField>

            <FormField label="Fornecedor principal" htmlFor="fornecedor">
              <Select
                id="fornecedor"
                value={form.fornecedorPrincipalId}
                onChange={(e) => atualizar('fornecedorPrincipalId', e.target.value)}
                placeholder="Selecione um fornecedor"
                opcoes={(fornecedores.dados ?? []).map((f) => ({ valor: f.id, label: f.nome }))}
              />
            </FormField>

            <FormField label="Imagem do produto" helper="Escolha um ícone para identificar o item.">
              <div className="rounded-md border border-dashed border-line bg-surface-2/40 p-3">
                <div className="mb-2.5 flex items-center gap-2 text-caption text-muted">
                  <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
                  Selecione um ícone
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {emojisSugeridos.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => atualizar('imagem', emoji)}
                      aria-label={`Usar ícone ${emoji}`}
                      className={
                        form.imagem === emoji
                          ? 'flex h-9 w-9 items-center justify-center rounded-md border border-teal bg-teal-50 text-[18px]'
                          : 'flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-[18px] transition-colors hover:bg-surface-2'
                      }
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </FormField>

            <FormField
              label="Observações"
              className="md:col-span-3"
              htmlFor="observacoes"
              acessorio={
                <span className="text-caption text-muted">{form.observacoes.length}/500</span>
              }
            >
              <Textarea
                id="observacoes"
                value={form.observacoes}
                maxLength={500}
                onChange={(e) => atualizar('observacoes', e.target.value)}
                placeholder="Informações adicionais sobre o produto..."
              />
            </FormField>
          </SectionCard>

          <div className="mc-card flex flex-wrap items-center justify-between gap-3 p-4">
            <Button variante="ghost" onClick={() => navegar('/cadastros/produtos')}>
              Cancelar
            </Button>
            <div className="flex flex-wrap gap-3">
              {modo === 'novo' && (
                <Button variante="outline" onClick={() => void salvar(true)} carregando={salvando}>
                  Salvar e cadastrar outro
                </Button>
              )}
              <Button onClick={() => void salvar(false)} carregando={salvando}>
                {modo === 'novo' ? 'Salvar produto' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard
            icone={<Lightbulb className="h-5 w-5 text-amber" strokeWidth={1.75} />}
            titulo="Dicas para um bom cadastro"
            classeCorpo="pt-4"
          >
            <ul className="space-y-3.5">
              {dicas.map((dica) => (
                <li key={dica} className="flex gap-2.5">
                  <CircleCheck
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal"
                    strokeWidth={1.75}
                  />
                  <span className="text-caption leading-relaxed text-muted">{dica}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard titulo="Prévia do produto" classeCorpo="pt-4">
            <div className="flex flex-col items-center border-b border-line pb-5">
              <ProductAvatar imagem={form.imagem} tamanho="lg" className="h-20 w-20 text-[38px]" />
              <p className="mt-3 text-center font-display text-card-title font-semibold text-ink">
                {form.nome || 'Nome do produto'}
              </p>
              <span className="mt-2">
                <Badge tom={categoriaSelecionada ? 'teal' : 'neutro'}>
                  {categoriaSelecionada?.nome ?? 'Categoria'}
                </Badge>
              </span>
            </div>

            <dl className="pt-1">
              <LinhaPrevia rotulo="Marca" valor={marcaSelecionada?.nome ?? '-'} />
              <LinhaPrevia rotulo="EAN" valor={form.ean || '-'} />
              <LinhaPrevia rotulo="Unidade" valor={form.conteudo || form.unidade} />
              <LinhaPrevia
                rotulo={lojaPrincipal ? `Preço · ${lojaPrincipal.lojaNome}` : 'Preço de venda'}
                valor={<span className="text-teal">{moeda(lojaPrincipal?.precoVenda ?? 0)}</span>}
              />
              <LinhaPrevia rotulo="Estoque no central" valor={`${estoqueCentral} un.`} />
              <LinhaPrevia
                rotulo="Lojas que vendem"
                valor={`${lojas.filter((l) => l.ativo).length} de ${lojas.length}`}
              />
            </dl>
          </SectionCard>
        </aside>
      </div>
      <DialogoCatalogo
        tipo={criando ?? 'categoria'}
        aberto={criando !== null}
        aoFechar={() => setCriando(null)}
        aoCriar={(id) => {
          // Recarrega a lista e já deixa o item novo escolhido — quem acabou de
          // criar a categoria quer usá-la agora.
          if (criando === 'categoria') {
            categorias.recarregar()
            atualizar('categoriaId', id)
          } else {
            marcas.recarregar()
            atualizar('marcaId', id)
          }
        }}
      />
    </PageContainer>
  )
}

function LinhaPrevia({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-caption text-muted">{rotulo}</dt>
      <dd className="text-label font-medium tabular text-ink">{valor}</dd>
    </div>
  )
}
