import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemLojaView, Pagamento, VendaListItem } from '@/models'
import { AppSession, LojaService, PROVEDOR_PAGAMENTO, VendaService } from '@/services'

/** O totem não recebe dinheiro: sem operador, não há quem dê troco. */
export const FORMAS_TOTEM = ['cartao-credito', 'cartao-debito', 'pix'] as const
export type FormaTotem = (typeof FORMAS_TOTEM)[number]

const INTERVALO_POLLING_MS = 1500
/** Ninguém aproximou o cartão: aborta e volta a oferecer as formas. */
const TEMPO_LIMITE_MS = 120_000
/** Depois do resultado, a tela volta ao início sozinha. */
export const VOLTAR_AO_INICIO_S = 12

export interface ItemCarrinho {
  produtoId: string
  nome: string
  imagem: string
  preco: number
  quantidade: number
  /** Quanto a loja tem — o cliente não passa disso no carrinho. */
  disponivel: number
}

export type Etapa =
  | { tipo: 'inicio' }
  | { tipo: 'carrinho' }
  | { tipo: 'pagamento' }
  | { tipo: 'aguardando'; pagamento: Pagamento; forma: FormaTotem; desde: number }
  | { tipo: 'aprovado'; venda: VendaListItem; pagamento: Pagamento }
  /** O pagamento não passou; a venda continua aberta para outra forma. */
  | { tipo: 'recusado'; titulo: string; motivo: string }
  /** A compra acabou sem concluir — o sistema cancelou (e estornou, se houve cobrança). */
  | { tipo: 'falha'; titulo: string; motivo: string }

/**
 * Estado do totem.
 *
 * O catálogo da loja é carregado uma vez e o código de barras resolve em
 * memória: cada leitura precisa responder no instante, e uma ida à API por
 * item seria o gargalo do caixa. O que vai à API é o que muda estado —
 * abrir a venda, pagar, sincronizar.
 *
 * A venda só é aberta quando o cliente escolhe a forma de pagamento. Até ali
 * o carrinho é só memória da tela: desistir não deixa rastro no banco.
 */
export function useTotem() {
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'inicio' })
  const [catalogo, setCatalogo] = useState<ItemLojaView[]>([])
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true)
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [venda, setVenda] = useState<VendaListItem | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  /** Uma chave por compra: reenviar depois de uma queda de rede não abre outra venda. */
  const chaveRef = useRef<string | null>(null)
  const sincronizandoRef = useRef(false)

  const total = arredondar(itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0))

  /* -------------------------------- catálogo -------------------------------- */

  const carregarCatalogo = useCallback(async () => {
    setCarregandoCatalogo(true)
    try {
      setCatalogo(await LojaService.listar({ status: 'todos' }))
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível carregar os produtos da loja.'))
    } finally {
      setCarregandoCatalogo(false)
    }
  }, [])

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  const buscar = useCallback(
    (termo: string): ItemLojaView[] => {
      const t = termo.trim()
      if (!t) return []
      const norm = normalizar(t)
      const numerico = /^\d+$/.test(t)
      return catalogo
        .filter((p) =>
          numerico
            ? p.ean.startsWith(t) || p.sku.toLowerCase().startsWith(norm)
            : normalizar(p.produtoNome).includes(norm) || normalizar(p.sku).includes(norm),
        )
        .slice(0, 8)
    },
    [catalogo],
  )

  const porCodigo = useCallback(
    (codigo: string): ItemLojaView | undefined => {
      const c = codigo.trim()
      if (!c) return undefined
      return catalogo.find((p) => p.ean === c || p.sku.toLowerCase() === c.toLowerCase())
    },
    [catalogo],
  )

  /* -------------------------------- carrinho -------------------------------- */

  const adicionar = useCallback(
    (produto: ItemLojaView, quantidade = 1): boolean => {
      if (produto.quantidade <= 0) {
        setErro(`"${produto.produtoNome}" está esgotado no momento.`)
        return false
      }
      const atual = itens.find((i) => i.produtoId === produto.produtoId)
      const nova = (atual?.quantidade ?? 0) + quantidade
      if (nova > produto.quantidade) {
        setErro(`Só há ${produto.quantidade} de "${produto.produtoNome}" na loja.`)
        return false
      }

      setItens((prev) =>
        atual
          ? prev.map((i) => (i.produtoId === produto.produtoId ? { ...i, quantidade: nova } : i))
          : [
              ...prev,
              {
                produtoId: produto.produtoId,
                nome: produto.produtoNome,
                imagem: produto.produtoImagem,
                preco: produto.precoVenda,
                quantidade,
                disponivel: produto.quantidade,
              },
            ],
      )
      setErro(null)
      return true
    },
    [itens],
  )

  /**
   * O que o leitor manda: código + Enter. Se não for código, é o que o
   * cliente digitou — vale se sobrar um único produto na busca.
   */
  const confirmarBusca = useCallback(
    (termo: string): boolean => {
      const exato = porCodigo(termo)
      if (exato) return adicionar(exato)
      const candidatos = buscar(termo)
      if (candidatos.length === 1) return adicionar(candidatos[0])
      setErro(
        candidatos.length === 0
          ? `Nenhum produto com o código "${termo.trim()}".`
          : 'Mais de um produto encontrado — toque no que você quer.',
      )
      return false
    },
    [adicionar, buscar, porCodigo],
  )

  const alterarQuantidade = useCallback((produtoId: string, delta: number) => {
    setItens((prev) =>
      prev
        .map((i) => {
          if (i.produtoId !== produtoId) return i
          const nova = Math.min(i.disponivel, Math.max(0, i.quantidade + delta))
          return { ...i, quantidade: nova }
        })
        .filter((i) => i.quantidade > 0),
    )
    setErro(null)
  }, [])

  const remover = useCallback((produtoId: string) => {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId))
  }, [])

  /* --------------------------------- etapas --------------------------------- */

  const reiniciar = useCallback(() => {
    setItens([])
    setVenda(null)
    setErro(null)
    chaveRef.current = null
    setEtapa({ tipo: 'inicio' })
    void carregarCatalogo()
  }, [carregarCatalogo])

  const comecar = useCallback(() => {
    setErro(null)
    setEtapa({ tipo: 'carrinho' })
  }, [])

  const irParaPagamento = useCallback(() => {
    if (itens.length === 0) return
    setErro(null)
    setEtapa({ tipo: 'pagamento' })
  }, [itens.length])

  /**
   * Voltar ao carrinho depois de já ter aberto a venda: os preços e itens
   * estão congelados nela, então ela é cancelada e uma nova nasce quando o
   * cliente pagar. O carrinho da tela fica como está.
   */
  const voltarAoCarrinho = useCallback(async () => {
    if (venda && venda.status === 'aberta') {
      setOcupado(true)
      try {
        await VendaService.cancelar(venda.id, 'Cliente voltou ao carrinho')
      } catch {
        /* já cancelada ou concluída pela conciliação: não impede continuar */
      } finally {
        setOcupado(false)
      }
      setVenda(null)
      chaveRef.current = null
    }
    setErro(null)
    setEtapa({ tipo: 'carrinho' })
  }, [venda])

  /**
   * Cancela a compra em qualquer ponto. Se a venda está aberta, a API aborta o
   * que estiver pendente na maquininha e estorna o que já tiver aprovado.
   */
  const cancelarCompra = useCallback(async () => {
    if (venda && venda.status === 'aberta') {
      setOcupado(true)
      try {
        await VendaService.cancelar(venda.id, 'Cliente cancelou no totem')
      } catch {
        /* idem */
      } finally {
        setOcupado(false)
      }
    }
    reiniciar()
  }, [reiniciar, venda])

  /* -------------------------------- pagamento ------------------------------- */

  /** Traduz o que a API devolveu a cada polling para a etapa da tela. */
  const tratar = useCallback((s: { pagamento: Pagamento; venda: VendaListItem }) => {
    setVenda(s.venda)
    const { pagamento, venda: v } = s

    if (pagamento.status === 'pendente') return

    if (pagamento.status === 'aprovado' && v.status === 'concluida') {
      setEtapa({ tipo: 'aprovado', venda: v, pagamento })
      return
    }

    // Aprovou, mas a venda não fechou: faltou estoque na hora e a API já
    // estornou e cancelou — o motivo está na observação da venda.
    if (v.status === 'cancelada') {
      setEtapa({
        tipo: 'falha',
        titulo: 'Não foi possível concluir a compra',
        motivo: v.observacao || 'A venda foi cancelada. Se houve cobrança, ela foi estornada.',
      })
      return
    }

    const titulos: Record<string, [string, string]> = {
      recusado: ['Pagamento recusado', pagamento.motivoRecusa || 'O pagamento não foi aprovado.'],
      cancelado: ['Pagamento cancelado', 'Você pode tentar outra forma de pagamento.'],
      expirado: ['Pagamento expirado', 'A maquininha não respondeu a tempo. Tente novamente.'],
      estornado: ['Pagamento estornado', 'O valor foi devolvido.'],
    }
    const [titulo, motivo] = titulos[pagamento.status] ?? [
      'Pagamento não concluído',
      'Tente outra forma de pagamento.',
    ]
    setEtapa({ tipo: 'recusado', titulo, motivo })
  }, [])

  const pagar = useCallback(
    async (forma: FormaTotem) => {
      if (itens.length === 0) return
      setOcupado(true)
      setErro(null)
      try {
        let v = venda
        if (!v || v.status !== 'aberta') {
          chaveRef.current ??= crypto.randomUUID()
          const aberta = await VendaService.abrir({
            lojaId: AppSession.lojaAtualId(),
            itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
            chaveIdempotencia: chaveRef.current,
          })
          v = aberta.venda
          setVenda(v)
        }

        const s = await VendaService.adicionarPagamento(v.id, {
          forma,
          valor: v.total,
          provedor: PROVEDOR_PAGAMENTO,
          chaveIdempotencia: crypto.randomUUID(),
        })
        setVenda(s.venda)

        if (s.pagamento.status === 'pendente') {
          setEtapa({ tipo: 'aguardando', pagamento: s.pagamento, forma, desde: Date.now() })
        } else {
          tratar(s)
        }
      } catch (e) {
        setErro(mensagemDe(e, 'Não foi possível iniciar o pagamento.'))
      } finally {
        setOcupado(false)
      }
    },
    [itens, tratar, venda],
  )

  const sincronizar = useCallback(async () => {
    if (etapa.tipo !== 'aguardando' || !venda || sincronizandoRef.current) return
    sincronizandoRef.current = true
    try {
      const s = await VendaService.sincronizarPagamento(venda.id, etapa.pagamento.id)
      tratar(s)
    } catch {
      // A rede piscou: o próximo tick tenta de novo. A conciliação do servidor
      // cobre o caso de a tela nunca mais voltar.
    } finally {
      sincronizandoRef.current = false
    }
  }, [etapa, tratar, venda])

  const abortar = useCallback(async () => {
    if (etapa.tipo !== 'aguardando' || !venda) return
    setOcupado(true)
    try {
      const s = await VendaService.abortarPagamento(venda.id, etapa.pagamento.id)
      // Se aprovou no exato instante, `tratar` mostra o aprovado — o dinheiro entrou.
      tratar(s)
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível cancelar o pagamento.'))
    } finally {
      setOcupado(false)
    }
  }, [etapa, tratar, venda])

  /** Controle da maquininha simulada: o cliente "aproximou o cartão". */
  const simular = useCallback(
    async (desfecho: 'aprovar' | 'recusar') => {
      if (etapa.tipo !== 'aguardando') return
      try {
        await VendaService.simular(etapa.pagamento.id, desfecho)
        await sincronizar()
      } catch (e) {
        setErro(mensagemDe(e, 'O simulador não respondeu.'))
      }
    },
    [etapa, sincronizar],
  )

  const tentarOutraForma = useCallback(() => {
    setErro(null)
    setEtapa({ tipo: 'pagamento' })
  }, [])

  // Polling enquanto a maquininha não responde; tempo esgotado aborta.
  useEffect(() => {
    if (etapa.tipo !== 'aguardando') return
    const id = window.setInterval(() => {
      if (Date.now() - etapa.desde > TEMPO_LIMITE_MS) {
        void abortar()
        return
      }
      void sincronizar()
    }, INTERVALO_POLLING_MS)
    return () => window.clearInterval(id)
  }, [abortar, etapa, sincronizar])

  // Depois do resultado, volta ao início sozinho.
  useEffect(() => {
    if (etapa.tipo !== 'aprovado' && etapa.tipo !== 'falha') return
    const id = window.setTimeout(reiniciar, VOLTAR_AO_INICIO_S * 1000)
    return () => window.clearTimeout(id)
  }, [etapa, reiniciar])

  return {
    etapa,
    catalogo,
    carregandoCatalogo,
    itens,
    total,
    venda,
    erro,
    ocupado,
    limparErro: () => setErro(null),
    buscar,
    adicionar,
    confirmarBusca,
    alterarQuantidade,
    remover,
    comecar,
    irParaPagamento,
    voltarAoCarrinho,
    cancelarCompra,
    pagar,
    abortar,
    simular,
    tentarOutraForma,
    reiniciar,
  }
}

export type Totem = ReturnType<typeof useTotem>

function arredondar(valor: number): number {
  return Number(valor.toFixed(2))
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}
