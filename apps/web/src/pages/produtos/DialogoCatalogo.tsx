import { useEffect, useState } from 'react'
import { CatalogoService, ErroDeNegocio } from '@/services'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { FormField, Input } from '@/components/ui/Form'
import { useToast } from '@/components/ui/toast-context'

/** Paleta das categorias — as mesmas cores usadas nos gráficos e badges. */
const CORES = [
  '#087F73', '#3979E9', '#F4A629', '#8B6FE0',
  '#D68A0F', '#18A66A', '#E5484D', '#65747E',
]

export interface DialogoCatalogoProps {
  tipo: 'categoria' | 'marca'
  aberto: boolean
  aoFechar: () => void
  /** Recebe o id do item criado, para já deixá-lo selecionado. */
  aoCriar: (id: string) => void
}

/**
 * Cria categoria ou marca **sem sair do formulário de produto**.
 *
 * O sidebar é canônico e não ganha item novo, e obrigar o usuário a abandonar
 * um cadastro pela metade para criar uma categoria seria pior: é justamente no
 * primeiro produto de uma conta nova que ela não existe ainda.
 */
export function DialogoCatalogo({ tipo, aberto, aoFechar, aoCriar }: DialogoCatalogoProps) {
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES[0])
  const [emoji, setEmoji] = useState('')
  const [erro, setErro] = useState<string>()
  const [salvando, setSalvando] = useState(false)

  // Reabrir o diálogo não deve trazer o que foi digitado da vez anterior.
  useEffect(() => {
    if (aberto) {
      setNome('')
      setCor(CORES[0])
      setEmoji('')
      setErro(undefined)
    }
  }, [aberto])

  const ehCategoria = tipo === 'categoria'

  const salvar = async () => {
    if (!nome.trim()) {
      setErro(`Informe o nome da ${tipo}.`)
      return
    }

    setSalvando(true)
    try {
      const criado = ehCategoria
        ? await CatalogoService.criarCategoria({ nome, cor, emoji })
        : await CatalogoService.criarMarca(nome)

      toast.sucesso(
        ehCategoria ? 'Categoria criada' : 'Marca criada',
        `"${criado.nome}" já pode ser usada.`,
      )
      aoCriar(criado.id)
      aoFechar()
    } catch (e) {
      const mensagem =
        e instanceof ErroDeNegocio ? e.message : `Não foi possível criar a ${tipo}.`
      setErro(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={ehCategoria ? 'Nova categoria' : 'Nova marca'}
      descricao={
        ehCategoria
          ? 'Categorias organizam o catálogo e aparecem nos filtros e relatórios.'
          : 'A marca é opcional no produto, mas ajuda a diferenciar itens parecidos.'
      }
      larguraMaxima="max-w-md"
      rodape={
        <>
          <Button variante="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} carregando={salvando}>
            Criar {ehCategoria ? 'categoria' : 'marca'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormField label="Nome" obrigatorio erro={erro} htmlFor="nome-catalogo">
          <Input
            id="nome-catalogo"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setErro(undefined)
            }}
            placeholder={ehCategoria ? 'Ex.: Bebidas' : 'Ex.: Coca-Cola'}
            erro={Boolean(erro)}
            autoFocus
          />
        </FormField>

        {ehCategoria && (
          <>
            <FormField label="Ícone" helper="Um emoji para identificar a categoria na lista.">
              <Input
                value={emoji}
                onChange={(e) => setEmoji([...e.target.value].slice(0, 2).join(''))}
                placeholder="🥤"
                className="w-24 text-center text-[18px]"
              />
            </FormField>

            <FormField label="Cor" helper="Usada nos gráficos e nas etiquetas.">
              <div className="flex flex-wrap gap-2">
                {CORES.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setCor(opcao)}
                    aria-label={`Cor ${opcao}`}
                    aria-pressed={cor === opcao}
                    className={
                      'h-8 w-8 rounded-full transition-transform mc-focus ' +
                      (cor === opcao
                        ? 'scale-110 ring-2 ring-ink/20 ring-offset-2'
                        : 'hover:scale-105')
                    }
                    style={{ backgroundColor: opcao }}
                  />
                ))}
              </div>
            </FormField>
          </>
        )}
      </div>
    </Dialog>
  )
}
