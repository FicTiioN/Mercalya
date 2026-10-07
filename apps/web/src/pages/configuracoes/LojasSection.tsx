import { useState } from 'react'
import { Check, Pencil, Plus, Store } from 'lucide-react'
import type { Loja } from '@/models'
import { AppSession, ErroDeNegocio, LojaService } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { useLojaAtual } from '@/lib/useLojaAtual'
import { cn } from '@/lib/cn'
import { SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, Input, Toggle } from '@/components/ui/Form'
import { Dialog } from '@/components/ui/Dialog'
import { SkeletonLinhas } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'

interface Formulario {
  id: string | null
  nome: string
  condominio: string
  ativa: boolean
}

const VAZIO: Formulario = { id: null, nome: '', condominio: '', ativa: true }

/**
 * Gestão das lojas da empresa.
 *
 * Criar uma loja cria a prateleira dela na API, no mesmo commit — por isso não
 * há "criar local" separado. Loja não é apagada: tem vendas e movimentações
 * apontando para ela; desativar tira do seletor e das operações.
 *
 * Depois de qualquer alteração a sessão é recarregada, para o seletor do
 * header e do menu refletirem a lista nova sem sair e entrar.
 */
export function LojasSection() {
  const toast = useToast()
  const lojaAtualId = useLojaAtual()
  const lojas = useRecurso(() => LojaService.todas(), [])

  const [form, setForm] = useState<Formulario | null>(null)
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const abrirNova = () => {
    setForm(VAZIO)
    setErro(undefined)
  }

  const abrirEdicao = (loja: Loja) => {
    setForm({ id: loja.id, nome: loja.nome, condominio: loja.condominio, ativa: loja.ativa })
    setErro(undefined)
  }

  const salvar = async () => {
    if (!form) return
    if (!form.nome.trim()) {
      setErro('Informe o nome da loja.')
      return
    }

    setOcupado(true)
    try {
      const entrada = { nome: form.nome.trim(), condominio: form.condominio.trim() }
      if (form.id) {
        // `ativa` só existe na edição: loja nova nasce ativa, e a API recusa
        // campo que o DTO de criação não declara.
        await LojaService.atualizar(form.id, { ...entrada, ativa: form.ativa })
        toast.sucesso('Loja atualizada', `"${entrada.nome}" foi salva.`)
      } else {
        await LojaService.criar(entrada)
        toast.sucesso('Loja criada', `"${entrada.nome}" já pode receber produtos e vendas.`)
      }
      await AppSession.recarregarLojas()
      lojas.recarregar()
      setForm(null)
    } catch (e) {
      setErro(e instanceof ErroDeNegocio ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  const usar = (loja: Loja) => {
    AppSession.selecionarLoja(loja.id)
    toast.info('Loja em uso', `Agora você está operando em "${loja.nome}".`)
  }

  const itens = lojas.dados ?? []

  return (
    <>
      <SectionCard
        icone={<Store className="h-5 w-5" strokeWidth={1.75} />}
        titulo="Lojas"
        descricao="Cada loja tem a própria prateleira e os próprios preços. O estoque central é um só."
        acoes={
          <Button
            variante="outline"
            tamanho="sm"
            onClick={abrirNova}
            iconeEsquerda={<Plus className="h-4 w-4" strokeWidth={2} />}
          >
            Nova loja
          </Button>
        }
        classeCorpo="pt-5"
      >
        {lojas.carregando ? (
          <SkeletonLinhas linhas={2} />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {itens.map((loja) => {
              const emUso = loja.id === lojaAtualId
              return (
                <li key={loja.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      emUso ? 'bg-teal-50 text-teal' : 'bg-surface-2 text-muted',
                    )}
                    aria-hidden
                  >
                    <Store className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-body font-medium text-ink">{loja.nome}</span>
                      {emUso && <Badge tom="teal">Em uso</Badge>}
                      {!loja.ativa && <Badge tom="neutro">Inativa</Badge>}
                    </span>
                    <span className="block truncate text-caption text-muted">
                      {loja.condominio || 'Sem condomínio informado'}
                    </span>
                  </span>
                  {loja.ativa && !emUso && (
                    <Button
                      variante="ghost"
                      tamanho="sm"
                      onClick={() => usar(loja)}
                      iconeEsquerda={<Check className="h-4 w-4" strokeWidth={2} />}
                    >
                      Usar
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEdicao(loja)}
                    aria-label={`Editar ${loja.nome}`}
                    className="rounded p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink mc-focus"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <Dialog
        aberto={form !== null}
        aoFechar={() => setForm(null)}
        titulo={form?.id ? 'Editar loja' : 'Nova loja'}
        descricao={
          form?.id
            ? undefined
            : 'A prateleira da loja é criada junto. Depois, defina o preço dos produtos nela.'
        }
        larguraMaxima="max-w-md"
        rodape={
          <>
            <Button variante="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} carregando={ocupado}>
              {form?.id ? 'Salvar' : 'Criar loja'}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FormField label="Nome" obrigatorio erro={erro} htmlFor="loja-nome">
              <Input
                id="loja-nome"
                value={form.nome}
                onChange={(e) => {
                  setForm({ ...form, nome: e.target.value })
                  setErro(undefined)
                }}
                placeholder="Mercadinho — Bloco B"
                erro={Boolean(erro)}
                autoFocus
              />
            </FormField>
            <FormField label="Condomínio" htmlFor="loja-condominio">
              <Input
                id="loja-condominio"
                value={form.condominio}
                onChange={(e) => setForm({ ...form, condominio: e.target.value })}
                placeholder="Residencial Parque Verde"
              />
            </FormField>
            {form.id && (
              <Toggle
                id="loja-ativa"
                ativo={form.ativa}
                aoMudar={(v) => setForm({ ...form, ativa: v })}
                label={
                  <span>
                    <span className="block text-body text-ink">Loja ativa</span>
                    <span className="block text-caption text-muted">
                      Inativa sai do seletor e não recebe vendas; o histórico fica.
                    </span>
                  </span>
                }
              />
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}
