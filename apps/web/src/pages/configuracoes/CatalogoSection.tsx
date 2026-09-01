import { useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { CatalogoService, ErroDeNegocio } from '@/services'
import type { CategoriaComUso, MarcaComUso } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, Input } from '@/components/ui/Form'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, SkeletonLinhas } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'

type Tipo = 'categoria' | 'marca'
type EmEdicao = { tipo: Tipo; id: string; nome: string } | null
type ParaExcluir = { tipo: Tipo; id: string; nome: string } | null

/**
 * Gestão de categorias e marcas.
 *
 * Fica em Configurações porque o sidebar é canônico e não ganha item novo — e
 * porque isto é manutenção ocasional, não operação do dia a dia. A criação, que
 * é frequente, acontece no próprio formulário de produto.
 */
export function CatalogoSection() {
  const toast = useToast()
  const categorias = useRecurso(() => CatalogoService.categoriasComUso(), [])
  const marcas = useRecurso(() => CatalogoService.marcasComUso(), [])

  const [editando, setEditando] = useState<EmEdicao>(null)
  const [excluindo, setExcluindo] = useState<ParaExcluir>(null)
  const [nomeEditado, setNomeEditado] = useState('')
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const abrirEdicao = (tipo: Tipo, id: string, nome: string) => {
    setEditando({ tipo, id, nome })
    setNomeEditado(nome)
    setErro(undefined)
  }

  const recarregar = (tipo: Tipo) =>
    tipo === 'categoria' ? categorias.recarregar() : marcas.recarregar()

  const salvarEdicao = async () => {
    if (!editando) return
    if (!nomeEditado.trim()) {
      setErro('Informe o nome.')
      return
    }

    setOcupado(true)
    try {
      if (editando.tipo === 'categoria') {
        await CatalogoService.atualizarCategoria(editando.id, { nome: nomeEditado })
      } else {
        await CatalogoService.atualizarMarca(editando.id, nomeEditado)
      }
      toast.sucesso('Nome atualizado', `Agora é "${nomeEditado.trim()}".`)
      recarregar(editando.tipo)
      setEditando(null)
    } catch (e) {
      setErro(e instanceof ErroDeNegocio ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluindo) return

    setOcupado(true)
    try {
      if (excluindo.tipo === 'categoria') await CatalogoService.removerCategoria(excluindo.id)
      else await CatalogoService.removerMarca(excluindo.id)

      toast.sucesso('Excluído', `"${excluindo.nome}" foi removido.`)
      recarregar(excluindo.tipo)
      setExcluindo(null)
    } catch (e) {
      // A API diz quantos registros dependem do item; a mensagem é acionável.
      toast.erro(
        'Não foi possível excluir',
        e instanceof ErroDeNegocio ? e.message : 'Tente novamente.',
      )
      setExcluindo(null)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <SectionCard
        icone={<Tags className="h-5 w-5" strokeWidth={1.75} />}
        titulo="Categorias e marcas"
        descricao="Organizam o catálogo. Novas também podem ser criadas direto no cadastro de produto."
        classeCorpo="pt-5 space-y-6"
      >
        <Lista
          titulo="Categorias"
          carregando={categorias.carregando}
          vazio="Nenhuma categoria ainda. Crie a primeira ao cadastrar um produto."
          itens={(categorias.dados ?? []).map((c: CategoriaComUso) => ({
            id: c.id,
            nome: c.nome,
            prefixo: c.emoji || undefined,
            cor: c.cor,
            uso:
              c.totalProdutos + c.totalFornecedores === 0
                ? 'Sem uso'
                : [
                    c.totalProdutos > 0 &&
                      `${c.totalProdutos} ${c.totalProdutos === 1 ? 'produto' : 'produtos'}`,
                    c.totalFornecedores > 0 &&
                      `${c.totalFornecedores} ${c.totalFornecedores === 1 ? 'fornecedor' : 'fornecedores'}`,
                  ]
                    .filter(Boolean)
                    .join(' · '),
          }))}
          aoEditar={(id, nome) => abrirEdicao('categoria', id, nome)}
          aoExcluir={(id, nome) => setExcluindo({ tipo: 'categoria', id, nome })}
        />

        <Lista
          titulo="Marcas"
          carregando={marcas.carregando}
          vazio="Nenhuma marca ainda. A marca é opcional no produto."
          itens={(marcas.dados ?? []).map((m: MarcaComUso) => ({
            id: m.id,
            nome: m.nome,
            uso:
              m.totalProdutos === 0
                ? 'Sem uso'
                : `${m.totalProdutos} ${m.totalProdutos === 1 ? 'produto' : 'produtos'}`,
          }))}
          aoEditar={(id, nome) => abrirEdicao('marca', id, nome)}
          aoExcluir={(id, nome) => setExcluindo({ tipo: 'marca', id, nome })}
        />
      </SectionCard>

      <Dialog
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.tipo === 'marca' ? 'Renomear marca' : 'Renomear categoria'}
        larguraMaxima="max-w-md"
        rodape={
          <>
            <Button variante="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarEdicao()} carregando={ocupado}>
              Salvar
            </Button>
          </>
        }
      >
        <FormField label="Nome" obrigatorio erro={erro} htmlFor="nome-edicao">
          <Input
            id="nome-edicao"
            value={nomeEditado}
            onChange={(e) => {
              setNomeEditado(e.target.value)
              setErro(undefined)
            }}
            erro={Boolean(erro)}
            autoFocus
          />
        </FormField>
      </Dialog>

      <ConfirmDialog
        aberto={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void confirmarExclusao()}
        titulo={`Excluir "${excluindo?.nome ?? ''}"?`}
        descricao="Só é possível excluir o que não está em uso. Se houver produtos ou fornecedores vinculados, troque-os antes."
        rotuloConfirmar="Excluir"
        carregando={ocupado}
        destrutivo
      />
    </>
  )
}

/* ------------------------------------------------------------------ */

interface ItemLista {
  id: string
  nome: string
  uso: string
  prefixo?: string
  cor?: string
}

function Lista({
  titulo,
  itens,
  carregando,
  vazio,
  aoEditar,
  aoExcluir,
}: {
  titulo: string
  itens: ItemLista[]
  carregando: boolean
  vazio: string
  aoEditar: (id: string, nome: string) => void
  aoExcluir: (id: string, nome: string) => void
}) {
  return (
    <div>
      <p className="mb-3 text-label font-medium text-ink">
        {titulo}
        <span className="ml-2 text-caption font-normal text-muted">{itens.length}</span>
      </p>

      {carregando ? (
        <SkeletonLinhas linhas={3} />
      ) : itens.length === 0 ? (
        <EmptyState
          icone={<Plus className="h-6 w-6" strokeWidth={1.5} />}
          titulo="Nada por aqui"
          descricao={vazio}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              {item.cor && (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px]"
                  style={{ backgroundColor: `${item.cor}1A`, color: item.cor }}
                  aria-hidden
                >
                  {item.prefixo ?? '●'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{item.nome}</span>
                <span className="block truncate text-caption text-muted">{item.uso}</span>
              </span>
              <button
                type="button"
                onClick={() => aoEditar(item.id, item.nome)}
                aria-label={`Renomear ${item.nome}`}
                className="rounded p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink mc-focus"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => aoExcluir(item.id, item.nome)}
                aria-label={`Excluir ${item.nome}`}
                className="rounded p-1.5 text-muted transition-colors hover:bg-danger-50 hover:text-danger mc-focus"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
