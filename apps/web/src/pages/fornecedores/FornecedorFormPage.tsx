import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  Handshake,
  MapPin,
  NotebookPen,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import { FornecedorService, ProdutoService } from '@/services'
import type { EntradaFornecedor } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import {
  data as formatarData,
  mascaraCep,
  mascaraCnpjCpf,
  mascaraTelefone,
  moeda,
  paraNumero,
} from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { EmptyState, SkeletonLinhas } from '@/components/ui/Feedback'
import { ProductAvatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

const ufs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const condicoesPagamento = ['À vista', '7 dias', '15 dias', '21 dias', '28 dias', '30 dias', '45 dias']

interface FormularioFornecedor {
  nome: string
  nomeFantasia: string
  documento: string
  categoriaPrincipalId: string
  contatoNome: string
  cargo: string
  telefone: string
  whatsapp: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  prazoEntregaDias: string
  condicaoPagamento: string
  descontoPadrao: string
  ativo: boolean
  observacoes: string
}

const formularioVazio: FormularioFornecedor = {
  nome: '',
  nomeFantasia: '',
  documento: '',
  categoriaPrincipalId: '',
  contatoNome: '',
  cargo: '',
  telefone: '',
  whatsapp: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  prazoEntregaDias: '',
  condicaoPagamento: '',
  descontoPadrao: '',
  ativo: true,
  observacoes: '',
}

export function FornecedorFormPage({ modo }: { modo: 'novo' | 'edicao' }) {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<FormularioFornecedor>(formularioVazio)
  const [erros, setErros] = useState<Partial<Record<keyof FormularioFornecedor, string>>>({})
  const [salvando, setSalvando] = useState(false)

  const categorias = useRecurso(() => ProdutoService.categorias(), [])
  const existente = useRecurso(
    async () => (modo === 'edicao' && id ? FornecedorService.obter(id) : null),
    [modo, id],
  )

  // Regra 25: fornecedor NOVO não possui histórico — os painéis laterais
  // ficam em empty state. Só o modo edição consulta dados reais.
  const produtos = useRecurso(
    async () => (modo === 'edicao' && id ? FornecedorService.produtosFornecidos(id) : []),
    [modo, id],
  )
  const compras = useRecurso(
    async () => (modo === 'edicao' && id ? FornecedorService.ultimasCompras(id) : []),
    [modo, id],
  )

  useEffect(() => {
    const f = existente.dados
    if (!f) return
    setForm({
      nome: f.nome,
      nomeFantasia: f.nomeFantasia,
      documento: f.documento,
      categoriaPrincipalId: f.categoriaPrincipalId,
      contatoNome: f.contato.nome,
      cargo: f.contato.cargo,
      telefone: f.contato.telefone,
      whatsapp: f.contato.whatsapp,
      email: f.contato.email,
      cep: f.endereco.cep,
      logradouro: f.endereco.logradouro,
      numero: f.endereco.numero,
      complemento: f.endereco.complemento,
      bairro: f.endereco.bairro,
      cidade: f.endereco.cidade,
      uf: f.endereco.uf,
      prazoEntregaDias: String(f.comercial.prazoEntregaDias),
      condicaoPagamento: f.comercial.condicaoPagamento,
      descontoPadrao: String(f.comercial.descontoPadrao),
      ativo: f.status === 'ativo',
      observacoes: f.observacoes,
    })
  }, [existente.dados])

  const atualizar = <K extends keyof FormularioFornecedor>(
    campo: K,
    valor: FormularioFornecedor[K],
  ) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  /**
   * Só o nome é obrigatório.
   *
   * Documento, categoria, contato, telefone, endereço e condições comerciais
   * são informações úteis, não requisitos do fluxo — nenhuma participa de regra
   * de negócio. Exigi-las travava o cadastro de um fornecedor de bairro cujo
   * CNPJ o lojista não tem à mão.
   *
   * O e-mail continua conferindo o formato **quando preenchido**: aceitar
   * "joao@" seria pior que aceitar vazio.
   */
  const validar = (): boolean => {
    const novos: Partial<Record<keyof FormularioFornecedor, string>> = {}
    if (!form.nome.trim()) novos.nome = 'Informe o nome do fornecedor.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novos.email = 'E-mail inválido.'
    }
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  const montarEntrada = (): EntradaFornecedor => ({
    nome: form.nome,
    nomeFantasia: form.nomeFantasia,
    documento: form.documento,
    categoriaPrincipalId: form.categoriaPrincipalId,
    contato: {
      nome: form.contatoNome,
      cargo: form.cargo,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      email: form.email,
    },
    endereco: {
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
    },
    comercial: {
      prazoEntregaDias: Number(form.prazoEntregaDias) || 0,
      condicaoPagamento: form.condicaoPagamento,
      descontoPadrao: paraNumero(form.descontoPadrao),
    },
    observacoes: form.observacoes,
    status: form.ativo ? 'ativo' : 'inativo',
  })

  const salvar = async (continuar: boolean) => {
    if (!validar()) {
      toast.aviso('Revise o formulário', 'Alguns campos obrigatórios precisam de atenção.')
      return
    }
    setSalvando(true)
    try {
      if (modo === 'edicao' && id) {
        const f = await FornecedorService.atualizar(id, montarEntrada())
        toast.sucesso('Fornecedor atualizado', f.nome)
        navegar('/cadastros/fornecedores')
        return
      }

      const f = await FornecedorService.criar(montarEntrada())
      toast.sucesso('Fornecedor cadastrado', `${f.nome} já pode ser usado em novas compras.`)
      if (continuar) {
        setForm(formularioVazio)
        setErros({})
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        navegar('/cadastros/fornecedores')
      }
    } catch (e) {
      toast.erro('Não foi possível salvar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const novo = modo === 'novo'

  return (
    <PageContainer>
      <PageHeader
        migalhas={[
          { label: 'Cadastros' },
          { label: 'Fornecedores', to: '/cadastros/fornecedores' },
          { label: novo ? 'Cadastrar fornecedor' : 'Editar fornecedor' },
        ]}
        titulo={novo ? 'Cadastrar fornecedor' : 'Editar fornecedor'}
        descricao="Preencha os dados do fornecedor para que ele possa abastecer sua loja com eficiência."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_324px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ------------------------------ Dados principais ---------------------- */}
          <SectionCard
            icone={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Dados principais"
            descricao="Quem é o fornecedor. Só o nome é obrigatório."
            classeCorpo="grid grid-cols-1 gap-5 pt-5 md:grid-cols-2"
          >
              <FormField label="Nome do fornecedor" obrigatorio erro={erros.nome} htmlFor="nome">
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => atualizar('nome', e.target.value)}
                  placeholder="Digite o nome do fornecedor"
                  erro={Boolean(erros.nome)}
                />
              </FormField>
              <FormField label="Nome fantasia" htmlFor="fantasia">
                <Input
                  id="fantasia"
                  value={form.nomeFantasia}
                  onChange={(e) => atualizar('nomeFantasia', e.target.value)}
                  placeholder="Digite o nome fantasia"
                />
              </FormField>
              <FormField label="CPF / CNPJ" erro={erros.documento} htmlFor="documento">
                <Input
                  id="documento"
                  value={form.documento}
                  onChange={(e) => atualizar('documento', mascaraCnpjCpf(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  erro={Boolean(erros.documento)}
                />
              </FormField>
              <FormField
                label="Categoria"
                erro={erros.categoriaPrincipalId}
                htmlFor="categoria"
              >
                <Select
                  id="categoria"
                  value={form.categoriaPrincipalId}
                  onChange={(e) => atualizar('categoriaPrincipalId', e.target.value)}
                  placeholder="Selecione uma categoria"
                  erro={Boolean(erros.categoriaPrincipalId)}
                  opcoes={(categorias.dados ?? []).map((c) => ({ valor: c.id, label: c.nome }))}
                />
              </FormField>
          </SectionCard>

          {/* -------------------------------- Contato ----------------------------- */}
          <SectionCard
            icone={<UserRound className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Contato principal"
            descricao="Com quem falar para fazer um pedido."
            classeCorpo="pt-5"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Nome do contato"
                erro={erros.contatoNome}
                htmlFor="contato"
              >
                <Input
                  id="contato"
                  value={form.contatoNome}
                  onChange={(e) => atualizar('contatoNome', e.target.value)}
                  placeholder="Digite o nome do contato"
                  erro={Boolean(erros.contatoNome)}
                />
              </FormField>
              <FormField label="Cargo" htmlFor="cargo">
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => atualizar('cargo', e.target.value)}
                  placeholder="Digite o cargo"
                />
              </FormField>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <FormField label="Telefone" erro={erros.telefone} htmlFor="telefone">
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => atualizar('telefone', mascaraTelefone(e.target.value))}
                  placeholder="(00) 0000-0000"
                  inputMode="tel"
                  erro={Boolean(erros.telefone)}
                />
              </FormField>
              <FormField label="WhatsApp" htmlFor="whatsapp">
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => atualizar('whatsapp', mascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </FormField>
              <FormField label="E-mail" erro={erros.email} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => atualizar('email', e.target.value)}
                  placeholder="exemplo@fornecedor.com.br"
                  erro={Boolean(erros.email)}
                />
              </FormField>
            </div>
          </SectionCard>

          {/* -------------------------------- Endereço ---------------------------- */}
          <SectionCard
            icone={<MapPin className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Endereço"
            descricao="Onde o fornecedor está."
            classeCorpo="pt-5"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              <FormField label="CEP" htmlFor="cep">
                <div className="flex">
                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => atualizar('cep', mascaraCep(e.target.value))}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className="rounded-r-none border-r-0"
                  />
                  <button
                    type="button"
                    aria-label="Buscar CEP"
                    onClick={() =>
                      toast.info('Busca de CEP', 'Será integrada junto com a API real.')
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md border border-line bg-surface-2 text-muted transition-colors hover:text-ink"
                  >
                    <Search className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </FormField>
              <FormField
                label="Endereço"
                erro={erros.logradouro}
                htmlFor="logradouro"
                className="md:col-span-2"
              >
                <Input
                  id="logradouro"
                  value={form.logradouro}
                  onChange={(e) => atualizar('logradouro', e.target.value)}
                  placeholder="Digite o endereço"
                  erro={Boolean(erros.logradouro)}
                />
              </FormField>
              <FormField label="Número" erro={erros.numero} htmlFor="numero">
                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(e) => atualizar('numero', e.target.value)}
                  placeholder="123"
                  erro={Boolean(erros.numero)}
                />
              </FormField>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
              <FormField label="Complemento" htmlFor="complemento">
                <Input
                  id="complemento"
                  value={form.complemento}
                  onChange={(e) => atualizar('complemento', e.target.value)}
                  placeholder="Apto, sala, bloco..."
                />
              </FormField>
              <FormField label="Bairro" erro={erros.bairro} htmlFor="bairro">
                <Input
                  id="bairro"
                  value={form.bairro}
                  onChange={(e) => atualizar('bairro', e.target.value)}
                  placeholder="Digite o bairro"
                  erro={Boolean(erros.bairro)}
                />
              </FormField>
              <FormField label="Cidade" erro={erros.cidade} htmlFor="cidade">
                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => atualizar('cidade', e.target.value)}
                  placeholder="Digite a cidade"
                  erro={Boolean(erros.cidade)}
                />
              </FormField>
              <FormField label="Estado" erro={erros.uf} htmlFor="uf">
                <Select
                  id="uf"
                  value={form.uf}
                  onChange={(e) => atualizar('uf', e.target.value)}
                  placeholder="UF"
                  erro={Boolean(erros.uf)}
                  opcoes={ufs.map((uf) => ({ valor: uf, label: uf }))}
                />
              </FormField>
            </div>
          </SectionCard>

          {/* -------------------------------- Comercial --------------------------- */}
          <SectionCard
            icone={<Handshake className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Comercial"
            descricao="Condições combinadas com este fornecedor."
            classeCorpo="grid grid-cols-1 gap-5 pt-5 md:grid-cols-4"
          >
              <FormField
                label="Prazo de entrega (dias)"
                erro={erros.prazoEntregaDias}
                htmlFor="prazo"
              >
                <Input
                  id="prazo"
                  type="number"
                  min={0}
                  value={form.prazoEntregaDias}
                  onChange={(e) => atualizar('prazoEntregaDias', e.target.value)}
                  placeholder="Ex.: 7"
                  erro={Boolean(erros.prazoEntregaDias)}
                />
              </FormField>
              <FormField
                label="Condição de pagamento"
                erro={erros.condicaoPagamento}
                htmlFor="condicao"
              >
                <Select
                  id="condicao"
                  value={form.condicaoPagamento}
                  onChange={(e) => atualizar('condicaoPagamento', e.target.value)}
                  placeholder="Selecione a condição"
                  erro={Boolean(erros.condicaoPagamento)}
                  opcoes={condicoesPagamento.map((c) => ({ valor: c, label: c }))}
                />
              </FormField>
              <FormField label="Desconto padrão (%)" htmlFor="desconto">
                <Input
                  id="desconto"
                  value={form.descontoPadrao}
                  onChange={(e) => atualizar('descontoPadrao', e.target.value)}
                  placeholder="Ex.: 0,00"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Fornecedor ativo">
                <div className="flex h-11 items-center">
                  <Toggle
                    ativo={form.ativo}
                    aoMudar={(v) => atualizar('ativo', v)}
                    label={form.ativo ? 'Ativo' : 'Inativo'}
                  />
                </div>
              </FormField>
          </SectionCard>

          {/* ------------------------------- Observações -------------------------- */}
          <SectionCard
            icone={<NotebookPen className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Observações"
            classeCorpo="pt-5"
          >
            <FormField
              label="Observações gerais"
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
                placeholder="Informações adicionais sobre o fornecedor..."
              />
            </FormField>
          </SectionCard>

          <div className="mc-card flex flex-wrap items-center justify-between gap-3 p-4">
            <Button variante="ghost" onClick={() => navegar('/cadastros/fornecedores')}>
              Cancelar
            </Button>
            <div className="flex flex-wrap gap-3">
              {novo && (
                <Button variante="outline" onClick={() => void salvar(true)} carregando={salvando}>
                  Salvar e continuar
                </Button>
              )}
              <Button onClick={() => void salvar(false)} carregando={salvando}>
                {novo ? 'Salvar fornecedor' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard
            icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Produtos fornecidos"
            acoes={
              !novo && produtos.dados && produtos.dados.length > 0 ? (
                <Badge tom="teal">{produtos.dados.length} itens</Badge>
              ) : undefined
            }
            classeCorpo="pt-4"
          >
            {novo ? (
              <EmptyState
                compacto
                icone={<Package className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Nenhum produto vinculado"
                descricao="Após salvar, vincule produtos a este fornecedor pelo cadastro de produtos."
              />
            ) : produtos.carregando ? (
              <SkeletonLinhas linhas={4} />
            ) : produtos.dados && produtos.dados.length > 0 ? (
              <ul className="-my-1.5">
                {produtos.dados.map((p) => (
                  <li
                    key={p.produtoId}
                    className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-0"
                  >
                    <ProductAvatar imagem={p.imagem} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label text-ink">{p.nome}</span>
                      <span className="block truncate text-caption text-muted">
                        {p.categoriaNome}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption tabular text-muted">
                      {p.quantidade} un
                    </span>
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
          </SectionCard>

          <SectionCard
            icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Últimas compras"
            classeCorpo="pt-4"
          >
            {novo ? (
              <EmptyState
                compacto
                icone={<Receipt className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Nenhuma compra realizada"
                descricao="O histórico aparece aqui após a primeira compra confirmada."
              />
            ) : compras.carregando ? (
              <SkeletonLinhas linhas={4} />
            ) : compras.dados && compras.dados.length > 0 ? (
              <ul className="-my-1.5">
                {compras.dados.map((c) => (
                  <li
                    key={c.compraId}
                    className="flex items-center gap-2.5 border-b border-line py-3 last:border-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-label text-ink">{formatarData(c.data)}</span>
                      <span className="block text-caption text-muted">Pedido {c.numero}</span>
                    </span>
                    <StatusBadge status={c.status} />
                    <span className="shrink-0 text-label font-medium tabular text-ink">
                      {moeda(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compacto
                icone={<Receipt className="h-5 w-5" strokeWidth={1.5} />}
                titulo="Nenhuma compra realizada"
                descricao="Este fornecedor ainda não possui compras confirmadas."
              />
            )}
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  )
}
