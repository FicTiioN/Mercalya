import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  FormaPagamentoVenda,
  Prisma,
  StatusPagamento,
  StatusProduto,
  StatusVenda,
  TipoMovimentacao,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NucleoEstoqueService, type Transacao } from '../estoque/nucleo.service'
import { PagamentosService } from '../pagamentos/pagamentos.service'
import { PROVEDOR_MANUAL, type SituacaoPagamento } from '../pagamentos/porta/provedor-pagamento'
import { EstoqueInsuficienteException } from '../comum/erros'
import { numero, numeroOuNulo } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { ConsultaVendasDto } from './dto/consulta-vendas.dto'
import type { AbrirVendaDto, PagamentoVendaDto, RegistrarVendaDto } from './dto/registrar-venda.dto'
import type { NovoPagamentoDto } from './dto/novo-pagamento.dto'

const DIA_MS = 86_400_000
const MINUTO_MS = 60_000

/** Quem assina o que a conciliação faz sozinha. */
export const OPERADOR_CONCILIACAO = 'Conciliação automática'

/** Pendente há mais que isto sem resposta do provedor: expira. */
const LIMITE_PENDENTE_MS = 10 * MINUTO_MS
/** Venda aberta há mais que isto sem pagamento pendente: carrinho abandonado. */
const LIMITE_ABANDONO_MS = 60 * MINUTO_MS
/** Não conciliar o que acabou de nascer — o totem ainda está fazendo polling. */
const IDADE_MINIMA_MS = 15_000

const ROTULOS_PAGAMENTO: Record<FormaPagamentoVenda, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
}

const INCLUIR = {
  itens: true,
  loja: true,
  pagamentos: { orderBy: { criadoEm: 'asc' } },
} satisfies Prisma.VendaInclude

type VendaCompleta = Prisma.VendaGetPayload<{ include: typeof INCLUIR }>
type PagamentoLinha = Prisma.PagamentoGetPayload<Record<string, never>>

interface EventoVenda {
  icone: 'venda' | 'pagamento' | 'comprovante' | 'cancelamento'
  titulo: string
  descricao: string
  quando: string
  autor: string
}

export interface ResumoConciliacao {
  verificados: number
  aprovados: number
  recusados: number
  expirados: number
  abandonadas: number
  erros: number
}

@Injectable()
export class VendasService {
  private readonly logger = new Logger(VendasService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly nucleo: NucleoEstoqueService,
    private readonly pagamentos: PagamentosService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Leitura                                                           */
  /* ---------------------------------------------------------------- */

  async listar(empresaId: string, consulta: ConsultaVendasDto) {
    const vendas = await this.buscar(empresaId, consulta)
    let itens = vendas.map((v) => this.paraContrato(v))

    if (consulta.busca?.trim()) {
      const termo = normalizar(consulta.busca.trim())
      itens = itens.filter(
        (v) =>
          normalizar(v.numero).includes(termo) ||
          normalizar(v.clienteNome).includes(termo) ||
          normalizar(v.operador).includes(termo),
      )
    }

    return paginar(itens, consulta.pagina, consulta.porPagina)
  }

  /**
   * KPIs do período, com variação contra o período **imediatamente anterior de
   * mesma duração**.
   *
   * Diferente da Loja, aqui o delta é calculável: as vendas têm data e valor,
   * então comparar 30 dias com os 30 anteriores é uma medição, não uma
   * estimativa. O mock devolvia 18,4% e 21,1% fixos.
   */
  async resumo(empresaId: string, consulta: ConsultaVendasDto) {
    const atual = await this.buscar(empresaId, consulta)
    const anterior = await this.buscarPeriodoAnterior(empresaId, consulta)

    const medir = (vendas: VendaCompleta[]) => {
      const concluidas = vendas.filter((v) => v.status === StatusVenda.CONCLUIDA)
      const faturamento = concluidas.reduce((acc, v) => acc + numero(v.total), 0)
      const itensVendidos = concluidas.reduce(
        (acc, v) => acc + v.itens.reduce((s, i) => s + numero(i.quantidade), 0),
        0,
      )
      return {
        total: vendas.length,
        faturamento,
        ticket: concluidas.length ? faturamento / concluidas.length : 0,
        itensVendidos,
        canceladas: vendas.filter((v) => v.status === StatusVenda.CANCELADA).length,
      }
    }

    const a = medir(atual)
    const b = medir(anterior)

    return {
      totalVendas: a.total,
      totalVendasDelta: variacao(a.total, b.total),
      faturamentoBruto: Number(a.faturamento.toFixed(2)),
      faturamentoDelta: variacao(a.faturamento, b.faturamento),
      ticketMedio: Number(a.ticket.toFixed(2)),
      ticketMedioDelta: variacao(a.ticket, b.ticket),
      itensVendidos: a.itensVendidos,
      itensVendidosDelta: variacao(a.itensVendidos, b.itensVendidos),
      canceladas: a.canceladas,
      canceladasDelta: variacao(a.canceladas, b.canceladas),
    }
  }

  async obter(empresaId: string, id: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { empresaId, OR: [{ id }, { numero: id }] },
      include: INCLUIR,
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')
    return this.paraContrato(venda)
  }

  /**
   * Linha do tempo da venda, derivada do próprio registro e dos pagamentos.
   * Cada evento corresponde a um fato gravado — nada aqui é inferido.
   */
  async historico(empresaId: string, id: string): Promise<EventoVenda[]> {
    const venda = await this.prisma.venda.findFirst({
      where: { empresaId, OR: [{ id }, { numero: id }] },
      include: { pagamentos: { orderBy: { criadoEm: 'asc' } }, itens: true },
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')

    const eventos: EventoVenda[] = [
      {
        icone: 'venda',
        titulo: 'Venda registrada',
        descricao: `${venda.itens.length} ${venda.itens.length === 1 ? 'item' : 'itens'} no ${venda.canal || 'PDV'}.`,
        quando: venda.data.toISOString(),
        autor: venda.operador,
      },
    ]

    for (const p of venda.pagamentos) {
      const forma = ROTULOS_PAGAMENTO[p.forma].toLowerCase()
      const via = p.provedor === PROVEDOR_MANUAL ? '' : ` via ${p.provedor}`
      const valor = formatarMoeda(p.valor)
      const quando = (p.confirmadoEm ?? p.criadoEm).toISOString()
      const autor = venda.operador

      switch (p.status) {
        case StatusPagamento.APROVADO:
        case StatusPagamento.ESTORNADO:
          eventos.push({
            icone: 'pagamento',
            titulo: 'Pagamento aprovado',
            descricao: `${valor} em ${forma}${via}.`,
            quando,
            autor,
          })
          break
        case StatusPagamento.RECUSADO:
          eventos.push({
            icone: 'cancelamento',
            titulo: 'Pagamento recusado',
            descricao: p.motivoRecusa || `${valor} em ${forma} não foi aprovado.`,
            quando,
            autor,
          })
          break
        case StatusPagamento.CANCELADO:
          eventos.push({
            icone: 'cancelamento',
            titulo: 'Pagamento abortado',
            descricao: `${valor} em ${forma}${via} — desistência antes de concluir.`,
            quando,
            autor,
          })
          break
        case StatusPagamento.EXPIRADO:
          eventos.push({
            icone: 'cancelamento',
            titulo: 'Pagamento expirado',
            descricao: p.motivoRecusa || `${valor} em ${forma}${via} ficou sem resposta.`,
            quando,
            autor,
          })
          break
        case StatusPagamento.PENDENTE:
          eventos.push({
            icone: 'pagamento',
            titulo: 'Aguardando pagamento',
            descricao: `${valor} em ${forma}${via}.`,
            quando,
            autor,
          })
          break
        default:
          break
      }
    }

    if (venda.concluidaEm) {
      eventos.push({
        icone: 'comprovante',
        titulo: 'Estoque baixado',
        descricao: 'Os itens saíram da prateleira da loja.',
        quando: venda.concluidaEm.toISOString(),
        autor: venda.operador,
      })
    }

    if (venda.status === StatusVenda.CANCELADA) {
      const estornados = venda.pagamentos.some((p) => p.status === StatusPagamento.ESTORNADO)
      eventos.push({
        icone: 'cancelamento',
        titulo: 'Venda cancelada',
        descricao: estornados
          ? 'Pagamentos estornados e mercadoria devolvida à prateleira.'
          : venda.observacao || 'O pagamento não foi aprovado.',
        quando: (venda.canceladaEm ?? venda.atualizadoEm).toISOString(),
        autor: venda.operador,
      })
    }

    return eventos.sort((a, b) => a.quando.localeCompare(b.quando))
  }

  async lojas(empresaId: string) {
    return this.prisma.loja.findMany({
      where: { empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Registro em uma chamada — venda já paga                           */
  /* ---------------------------------------------------------------- */

  /**
   * Registra uma venda **já paga**: o operador confirma que recebeu, e a API
   * grava venda, itens, pagamentos e a baixa do estoque da loja em uma
   * transação só. Se a baixa falhar por falta de saldo, nada fica — nem a
   * venda, nem o pagamento.
   *
   * É o caminho do balcão. O totem com maquininha usa os passos separados
   * (`abrirVenda` → `adicionarPagamento` → `sincronizarPagamento`), porque
   * entre abrir e concluir existe a espera do cartão.
   */
  async registrar(empresaId: string, usuario: string, entrada: RegistrarVendaDto) {
    return this.comChave(empresaId, entrada.chaveIdempotencia, async (chave) => {
      const vendaId = await this.nucleo.executar(async (tx) => {
        const venda = await this.abrir(tx, empresaId, usuario, entrada, chave)
        for (const p of entrada.pagamentos) {
          await this.gravarPagamento(tx, venda, p, PROVEDOR_MANUAL, null)
        }
        const concluiu = await this.concluirSeCoberta(tx, empresaId, usuario, venda.id)
        if (!concluiu) throw await this.insuficiente(tx, venda.id)
        return venda.id
      })
      return { venda: await this.obter(empresaId, vendaId), repetida: false }
    })
  }

  /* ---------------------------------------------------------------- */
  /* Fluxo do totem — venda aberta, pagamento na maquininha            */
  /* ---------------------------------------------------------------- */

  /** Abre o carrinho: itens e preços congelados, estoque intacto, sem pagamento. */
  async abrirVenda(empresaId: string, usuario: string, entrada: AbrirVendaDto) {
    return this.comChave(empresaId, entrada.chaveIdempotencia, async (chave) => {
      const vendaId = await this.nucleo.executar(async (tx) => {
        const venda = await this.abrir(tx, empresaId, usuario, entrada, chave)
        return venda.id
      })
      return { venda: await this.obter(empresaId, vendaId), repetida: false }
    })
  }

  /**
   * Adiciona um pagamento a uma venda aberta.
   *
   * Manual: nasce aprovado e, se cobrir o total, a venda conclui no mesmo
   * commit — faltou estoque, nada é gravado, o operador vê o erro antes de
   * guardar o dinheiro.
   *
   * Por provedor: nasce **pendente** e só então a maquininha é acionada, fora
   * da transação — rede não entra em commit. Se a API cair entre os dois
   * passos, fica um pendente sem referência externa; a conciliação expira.
   */
  async adicionarPagamento(
    empresaId: string,
    usuario: string,
    vendaId: string,
    entrada: NovoPagamentoDto,
  ) {
    const provedor = entrada.provedor?.trim() || PROVEDOR_MANUAL
    const manual = provedor === PROVEDOR_MANUAL
    const chave = entrada.chaveIdempotencia?.trim() || null

    if (!manual && entrada.forma === 'dinheiro') {
      throw new ConflictException('Dinheiro não passa pela maquininha.')
    }

    const { pagamentoId, criado } = await this.nucleo.executar(async (tx) => {
      const venda = await tx.venda.findFirst({
        where: { id: vendaId, empresaId },
        include: { pagamentos: true },
      })
      if (!venda) throw new NotFoundException('Venda não encontrada.')

      if (chave) {
        const repetido = venda.pagamentos.find((p) => p.chaveIdempotencia === chave)
        if (repetido) return { pagamentoId: repetido.id, criado: false }
      }

      if (venda.status !== StatusVenda.ABERTA) {
        throw new ConflictException('Esta venda não está aberta para pagamento.')
      }

      const pagamento = await this.gravarPagamento(tx, venda, entrada, provedor, chave)
      if (manual) await this.concluirSeCoberta(tx, empresaId, usuario, venda.id)
      return { pagamentoId: pagamento.id, criado: true }
    })

    if (criado && !manual) await this.enviarAoProvedor(pagamentoId)

    return this.situacaoPagamento(empresaId, vendaId, pagamentoId)
  }

  /**
   * O totem pergunta "e então?". Consulta o provedor se ainda está pendente,
   * grava o que voltou e, se a venda ficou coberta, conclui — debitando o
   * estoque. É a mesma função que um webhook chamaria.
   */
  async sincronizarPagamento(
    empresaId: string,
    usuario: string,
    vendaId: string,
    pagamentoId: string,
  ) {
    const pagamento = await this.pagamentoDaVenda(empresaId, vendaId, pagamentoId)

    if (
      pagamento.status === StatusPagamento.PENDENTE &&
      this.pagamentos.usaProvedor(pagamento) &&
      pagamento.referenciaExterna
    ) {
      const situacao = await this.pagamentos.consultar(pagamento)
      await this.aplicar(pagamento.id, situacao)
    }

    await this.tentarConcluir(empresaId, usuario, vendaId)
    return this.situacaoPagamento(empresaId, vendaId, pagamentoId)
  }

  /**
   * O cliente desistiu no meio. Aborta no provedor; se ele responder que já
   * tinha aprovado — o cartão encostou no exato instante —, o dinheiro entrou
   * e a venda conclui em vez de abortar.
   */
  async abortarPagamento(
    empresaId: string,
    usuario: string,
    vendaId: string,
    pagamentoId: string,
  ) {
    const pagamento = await this.pagamentoDaVenda(empresaId, vendaId, pagamentoId)
    if (pagamento.status !== StatusPagamento.PENDENTE) {
      throw new ConflictException('Só um pagamento pendente pode ser abortado.')
    }

    const situacao: SituacaoPagamento =
      this.pagamentos.usaProvedor(pagamento) && pagamento.referenciaExterna
        ? await this.pagamentos.abortar(pagamento)
        : { status: 'cancelado', bruto: null }

    await this.aplicar(pagamento.id, situacao)
    await this.tentarConcluir(empresaId, usuario, vendaId)
    return this.situacaoPagamento(empresaId, vendaId, pagamentoId)
  }

  /* ---------------------------------------------------------------- */
  /* Cancelamento                                                      */
  /* ---------------------------------------------------------------- */

  /**
   * Cancela uma venda devolvendo a mercadoria à prateleira **nos mesmos lotes**
   * de onde saiu. A movimentação `VENDA` guarda o lote, então a devolução não é
   * estimativa — é o inverso exato da baixa.
   *
   * Pagamentos por provedor são resolvidos **antes** da transação, porque é
   * rede: pendentes são abortados, aprovados são estornados. Só com todas as
   * respostas em mão o banco muda — e muda tudo junto.
   */
  async cancelar(empresaId: string, usuario: string, id: string, motivo?: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { empresaId, OR: [{ id }, { numero: id }] },
      include: { pagamentos: true },
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')
    if (venda.status === StatusVenda.CANCELADA) {
      throw new ConflictException('Esta venda já foi cancelada.')
    }

    const situacoes = await this.resolverNoProvedor(venda.pagamentos)

    await this.nucleo.executar(async (tx) => {
      const agora = new Date()

      if (venda.status === StatusVenda.CONCLUIDA) {
        await this.devolverAosLotes(tx, empresaId, usuario, venda, motivo, agora)
      }

      for (const [pagamentoId, situacao] of situacoes) {
        await tx.pagamento.update({
          where: { id: pagamentoId },
          data: this.pagamentos.dadosDaSituacao(situacao),
        })
      }

      // O que sobrou é manual: o operador devolve o dinheiro / esquece o pendente.
      await tx.pagamento.updateMany({
        where: { vendaId: venda.id, status: StatusPagamento.APROVADO },
        data: { status: StatusPagamento.ESTORNADO },
      })
      await tx.pagamento.updateMany({
        where: { vendaId: venda.id, status: StatusPagamento.PENDENTE },
        data: { status: StatusPagamento.CANCELADO, confirmadoEm: agora },
      })

      await tx.venda.update({
        where: { id: venda.id },
        data: {
          status: StatusVenda.CANCELADA,
          canceladaEm: agora,
          ...(motivo?.trim() ? { observacao: motivo.trim() } : {}),
        },
      })
    })

    return this.obter(empresaId, venda.id)
  }

  /* ---------------------------------------------------------------- */
  /* Conciliação                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Fecha o buraco do timeout.
   *
   * O caso que quebra PDV: a maquininha aprovou, mas a resposta não chegou ao
   * totem — que travou, reiniciou ou perdeu a rede. O pagamento fica pendente
   * do nosso lado e aprovado do lado deles: dinheiro que entrou sem venda.
   *
   * Roda a cada minuto. Para cada pendente com mais de alguns segundos:
   * pergunta ao provedor e aplica a resposta (aprovou → conclui a venda).
   * Pendente há mais de 10 minutos sem resposta é abortado e expira. Venda
   * aberta há mais de 1 hora sem pagamento pendente é carrinho abandonado:
   * cancela, estornando o que tiver sido aprovado pelo caminho.
   *
   * `agora` é parâmetro para os testes não precisarem esperar dez minutos.
   */
  async conciliar(empresaId?: string, agora = new Date()): Promise<ResumoConciliacao> {
    const resumo: ResumoConciliacao = {
      verificados: 0,
      aprovados: 0,
      recusados: 0,
      expirados: 0,
      abandonadas: 0,
      erros: 0,
    }

    const pendentes = await this.prisma.pagamento.findMany({
      where: {
        ...(empresaId ? { empresaId } : {}),
        status: StatusPagamento.PENDENTE,
        provedor: { not: PROVEDOR_MANUAL },
        criadoEm: { lt: new Date(agora.getTime() - IDADE_MINIMA_MS) },
      },
      orderBy: { criadoEm: 'asc' },
    })

    for (const pagamento of pendentes) {
      resumo.verificados += 1
      const idade = agora.getTime() - pagamento.criadoEm.getTime()

      try {
        let situacao: SituacaoPagamento

        if (!pagamento.referenciaExterna) {
          // Gravado aqui, nunca chegou ao provedor (a API caiu no meio).
          if (idade < LIMITE_PENDENTE_MS) continue
          situacao = {
            status: 'expirado',
            motivoRecusa: 'Nunca chegou ao provedor.',
            bruto: null,
          }
        } else {
          situacao = await this.pagamentos.consultar(pagamento)
          if (situacao.status === 'pendente' && idade >= LIMITE_PENDENTE_MS) {
            const abortada = await this.pagamentos.abortar(pagamento)
            situacao =
              abortada.status === 'aprovado'
                ? abortada
                : {
                    ...abortada,
                    status: 'expirado',
                    motivoRecusa: 'Sem resposta do cliente no prazo.',
                  }
          }
        }

        if (situacao.status === 'pendente') continue

        await this.aplicar(pagamento.id, situacao)
        if (situacao.status === 'aprovado') {
          resumo.aprovados += 1
          await this.tentarConcluir(pagamento.empresaId, OPERADOR_CONCILIACAO, pagamento.vendaId)
        } else if (situacao.status === 'recusado') {
          resumo.recusados += 1
        } else {
          resumo.expirados += 1
        }
      } catch (erro) {
        resumo.erros += 1
        this.logger.warn(
          `Conciliação do pagamento ${pagamento.id} falhou: ${erro instanceof Error ? erro.message : erro}`,
        )
      }
    }

    const abandonadas = await this.prisma.venda.findMany({
      where: {
        ...(empresaId ? { empresaId } : {}),
        status: StatusVenda.ABERTA,
        criadoEm: { lt: new Date(agora.getTime() - LIMITE_ABANDONO_MS) },
        pagamentos: { none: { status: StatusPagamento.PENDENTE } },
      },
      select: { id: true, empresaId: true },
    })

    for (const venda of abandonadas) {
      try {
        // Pode estar coberta e só não ter concluído (queda entre aprovar e concluir).
        await this.tentarConcluir(venda.empresaId, OPERADOR_CONCILIACAO, venda.id)
        const atual = await this.prisma.venda.findUnique({
          where: { id: venda.id },
          select: { status: true },
        })
        if (atual?.status !== StatusVenda.ABERTA) continue

        await this.cancelar(
          venda.empresaId,
          OPERADOR_CONCILIACAO,
          venda.id,
          'Venda abandonada: sem pagamento completo no prazo.',
        )
        resumo.abandonadas += 1
      } catch (erro) {
        resumo.erros += 1
        this.logger.warn(
          `Conciliação da venda ${venda.id} falhou: ${erro instanceof Error ? erro.message : erro}`,
        )
      }
    }

    return resumo
  }

  /* ---------------------------------------------------------------- */
  /* Passos da venda                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Cria a venda ABERTA: itens com nome e preço **congelados**, totais
   * calculados, estoque intacto.
   *
   * O preço vem da configuração da loja, nunca do cliente. Produto sem
   * configuração, inativo ou sem preço é recusado antes de qualquer gravação.
   */
  private async abrir(
    tx: Transacao,
    empresaId: string,
    usuario: string,
    entrada: AbrirVendaDto,
    chaveIdempotencia: string | null,
  ) {
    const lojaId = entrada.lojaId ?? (await this.lojaPadrao(tx, empresaId))
    const loja = await tx.loja.findFirst({ where: { id: lojaId, empresaId, ativa: true } })
    if (!loja) throw new NotFoundException('Loja não encontrada.')

    if (entrada.clienteId) {
      const cliente = await tx.cliente.findFirst({
        where: { id: entrada.clienteId, empresaId },
        select: { id: true },
      })
      if (!cliente) throw new NotFoundException('Cliente não encontrado.')
    }

    // O mesmo produto pode vir mais de uma vez — o leitor passou duas vezes
    // pelo código. Vira uma linha só, com a quantidade somada.
    const quantidades = new Map<string, number>()
    for (const item of entrada.itens) {
      quantidades.set(item.produtoId, (quantidades.get(item.produtoId) ?? 0) + item.quantidade)
    }

    const configuracoes = await tx.configuracaoProdutoLoja.findMany({
      where: { lojaId, produtoId: { in: [...quantidades.keys()] }, produto: { empresaId } },
      include: { produto: true },
    })

    const itens: Prisma.ItemVendaCreateWithoutVendaInput[] = []
    for (const [produtoId, quantidade] of quantidades) {
      const config = configuracoes.find((c) => c.produtoId === produtoId)
      if (!config) {
        const produto = await tx.produto.findFirst({
          where: { id: produtoId, empresaId },
          select: { nome: true },
        })
        throw new ConflictException(
          produto
            ? `"${produto.nome}" não está à venda nesta loja.`
            : 'Produto não encontrado.',
        )
      }
      if (!config.ativo || config.produto.status !== StatusProduto.ATIVO) {
        throw new ConflictException(`"${config.produto.nome}" não está disponível para venda.`)
      }

      const preco = numero(config.precoVenda)
      if (preco <= 0) {
        throw new ConflictException(`"${config.produto.nome}" está sem preço nesta loja.`)
      }

      itens.push({
        produto: { connect: { id: produtoId } },
        produtoNome: config.produto.nome,
        ean: config.produto.ean ?? '',
        imagem: config.produto.imagem,
        quantidade,
        precoUnitario: preco,
        total: arredondar(quantidade * preco),
        // Custo médio no instante da venda: a margem fica apurável depois,
        // mesmo que o custo do produto mude com a próxima compra.
        custoUnitario: config.produto.custoMedio,
      })
    }

    const subtotal = arredondar(itens.reduce((acc, i) => acc + numero(i.total as number), 0))
    const desconto = arredondar(entrada.desconto ?? 0)
    if (desconto > subtotal) {
      throw new ConflictException('O desconto não pode ser maior que o valor da venda.')
    }
    const total = arredondar(subtotal - desconto)
    if (total <= 0) throw new ConflictException('A venda precisa ter valor maior que zero.')

    const numeroVenda = await this.nucleo.proximoNumero(tx, empresaId, 'venda', 'VDA', 1000, 6)

    return tx.venda.create({
      data: {
        empresaId,
        numero: numeroVenda,
        lojaId,
        clienteId: entrada.clienteId ?? null,
        clienteNome: entrada.clienteNome?.trim() || 'Consumidor final',
        operador: usuario,
        data: new Date(),
        subtotal,
        desconto,
        acrescimo: 0,
        total,
        chaveIdempotencia,
        tipoVenda: 'Venda presencial',
        canal: 'PDV',
        observacao: entrada.observacao?.trim() ?? '',
        status: StatusVenda.ABERTA,
        itens: { create: itens },
      },
    })
  }

  /**
   * Grava um pagamento numa venda aberta, com as regras de valor:
   *
   * - uma maquininha por vez — havendo pendente, aborte antes de outro;
   * - forma que não é dinheiro não passa do que falta: cartão "cobrado a
   *   mais" seria um erro, não uma sobra;
   * - dinheiro pode passar — o excedente vira troco na conclusão.
   */
  private async gravarPagamento(
    tx: Transacao,
    venda: { id: string; empresaId: string; total: Prisma.Decimal },
    entrada: PagamentoVendaDto | NovoPagamentoDto,
    provedor: string,
    chaveIdempotencia: string | null,
  ) {
    const existentes = await tx.pagamento.findMany({
      where: { vendaId: venda.id },
      select: { status: true, valor: true },
    })
    if (existentes.some((p) => p.status === StatusPagamento.PENDENTE)) {
      throw new ConflictException(
        'Há um pagamento aguardando a maquininha. Aborte-o antes de registrar outro.',
      )
    }

    const aprovado = somar(existentes.filter((p) => p.status === StatusPagamento.APROVADO))
    const restante = arredondar(numero(venda.total) - aprovado)
    if (restante <= 0) throw new ConflictException('Esta venda já está paga.')

    const valor = arredondar(entrada.valor)
    if (entrada.forma !== 'dinheiro' && valor > restante) {
      throw new ConflictException('Só pagamento em dinheiro pode gerar troco.')
    }

    const manual = provedor === PROVEDOR_MANUAL
    return tx.pagamento.create({
      data: {
        empresaId: venda.empresaId,
        vendaId: venda.id,
        forma: paraEnum<FormaPagamentoVenda>(entrada.forma),
        valor,
        parcelas: entrada.parcelas ?? 1,
        provedor,
        chaveIdempotencia,
        status: manual ? StatusPagamento.APROVADO : StatusPagamento.PENDENTE,
        confirmadoEm: manual ? new Date() : null,
      },
    })
  }

  /**
   * Conclui a venda se os pagamentos aprovados cobrem o total — e **só então**
   * debita o estoque.
   *
   * A troca de status é o lock: `updateMany` com `status: ABERTA` no `where`.
   * Duas conclusões simultâneas (dois pagamentos aprovando juntos) disputam a
   * linha; a segunda reavalia o `where` depois do commit da primeira e não
   * encontra mais ABERTA. Se a baixa falhar, a troca é desfeita com ela.
   *
   * Não conclui enquanto houver pagamento pendente: um cartão que aprovasse
   * depois seria cobrança em dobro.
   */
  private async concluirSeCoberta(
    tx: Transacao,
    empresaId: string,
    usuario: string,
    vendaId: string,
  ): Promise<boolean> {
    const venda = await tx.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true, pagamentos: true },
    })
    if (!venda || venda.status !== StatusVenda.ABERTA) return false
    if (venda.pagamentos.some((p) => p.status === StatusPagamento.PENDENTE)) return false

    const aprovados = venda.pagamentos.filter((p) => p.status === StatusPagamento.APROVADO)
    const soma = somar(aprovados)
    const total = numero(venda.total)
    if (soma < total) return false

    const troco = arredondar(soma - total)
    const emDinheiro = somar(aprovados.filter((p) => p.forma === FormaPagamentoVenda.DINHEIRO))
    if (troco > emDinheiro) {
      throw new ConflictException('Só pagamento em dinheiro pode gerar troco.')
    }

    const agora = new Date()
    const trocou = await tx.venda.updateMany({
      where: { id: vendaId, status: StatusVenda.ABERTA },
      data: { status: StatusVenda.CONCLUIDA, concluidaEm: agora, troco },
    })
    if (trocou.count === 0) return false

    await this.debitar(tx, empresaId, usuario, venda, agora)
    return true
  }

  /** Baixa FEFO na prateleira da loja, uma movimentação `VENDA` por lote consumido. */
  private async debitar(
    tx: Transacao,
    empresaId: string,
    usuario: string,
    venda: Prisma.VendaGetPayload<{ include: { itens: true } }>,
    agora: Date,
  ) {
    const local = await this.nucleo.localDaLoja(tx, empresaId, venda.lojaId)

    // Confere tudo antes de mover: recusar no meio deixaria o operador sem
    // saber quais itens passaram — mesmo com o rollback resolvendo o dado.
    for (const item of venda.itens) {
      const disponivel = await this.nucleo.disponivelNoLocal(tx, item.produtoId, local.id)
      if (numero(item.quantidade) > disponivel) {
        throw new EstoqueInsuficienteException(
          `Estoque insuficiente de "${item.produtoNome}" na loja (disponível: ${disponivel}).`,
        )
      }
    }

    for (const item of venda.itens) {
      const consumidos = await this.nucleo.consumirFefo(tx, {
        produtoId: item.produtoId,
        localId: local.id,
        quantidade: numero(item.quantidade),
      })

      for (const consumo of consumidos) {
        await this.nucleo.registrarMovimentacao(tx, {
          empresaId,
          tipo: TipoMovimentacao.VENDA,
          produtoId: item.produtoId,
          loteId: consumo.loteId,
          // Saída é negativa, como perda: o sinal diz a direção no histórico.
          quantidade: -consumo.quantidade,
          origemId: local.id,
          origemLabel: local.nome,
          destinoId: null,
          destinoLabel: '-',
          usuario,
          observacao: `Venda ${venda.numero}`,
          documento: venda.numero,
          custoUnitario: consumo.custoUnitario,
          valorTotal: arredondar(consumo.quantidade * numero(item.precoUnitario)),
          data: agora,
        })
      }

      await tx.produto.update({
        where: { id: item.produtoId },
        data: { ultimaVendaEm: agora },
      })
    }
  }

  /**
   * Tenta concluir uma venda aberta em transação própria.
   *
   * Está separado de "aplicar a aprovação" de propósito: são duas invariantes
   * distintas. "O pagamento foi aprovado" é um fato que precisa ficar gravado
   * mesmo que a venda não possa concluir. Se faltou estoque enquanto o cartão
   * era processado, o caminho é o estorno — não perder a aprovação.
   */
  private async tentarConcluir(empresaId: string, usuario: string, vendaId: string) {
    try {
      await this.nucleo.executar((tx) => this.concluirSeCoberta(tx, empresaId, usuario, vendaId))
    } catch (erro) {
      if (!(erro instanceof EstoqueInsuficienteException)) throw erro
      await this.estornarPorFaltaDeEstoque(empresaId, usuario, vendaId, erro.message)
    }
  }

  /**
   * O cliente pagou, mas o último item saiu para outro carrinho no meio do
   * processamento. Devolve o dinheiro no provedor e cancela a venda, dizendo
   * por quê.
   */
  private async estornarPorFaltaDeEstoque(
    empresaId: string,
    usuario: string,
    vendaId: string,
    motivo: string,
  ) {
    this.logger.warn(`Venda ${vendaId} aprovada sem estoque para concluir — estornando. ${motivo}`)
    await this.cancelar(
      empresaId,
      usuario,
      vendaId,
      `Cancelada automaticamente: ${motivo} Pagamento estornado.`,
    )
  }

  /** Aciona a maquininha para um pagamento recém-gravado e guarda a referência. */
  private async enviarAoProvedor(pagamentoId: string) {
    const pagamento = await this.prisma.pagamento.findUniqueOrThrow({
      where: { id: pagamentoId },
      include: { venda: { select: { numero: true } } },
    })

    try {
      const intencao = await this.pagamentos.iniciar(pagamento, `Venda ${pagamento.venda.numero}`)
      await this.prisma.pagamento.update({
        where: { id: pagamentoId },
        data: {
          referenciaExterna: intencao.referenciaExterna,
          retornoBruto: intencao.bruto as Prisma.InputJsonValue,
        },
      })
      if (intencao.status !== 'pendente') {
        await this.aplicar(pagamentoId, { status: intencao.status, bruto: intencao.bruto })
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      await this.aplicar(pagamentoId, {
        status: 'recusado',
        motivoRecusa: `Falha ao acionar a maquininha: ${mensagem}`,
        bruto: null,
      })
      throw new ConflictException(`Não foi possível iniciar o pagamento na maquininha: ${mensagem}`)
    }
  }

  /** Aborta pendentes e estorna aprovados no provedor. Rede — fora de transação. */
  private async resolverNoProvedor(pagamentos: PagamentoLinha[]) {
    const situacoes = new Map<string, SituacaoPagamento>()

    for (const p of pagamentos) {
      if (!this.pagamentos.usaProvedor(p) || !p.referenciaExterna) continue

      if (p.status === StatusPagamento.PENDENTE) {
        let situacao = await this.pagamentos.abortar(p)
        if (situacao.status === 'aprovado') {
          // Aprovou no exato instante do cancelamento: agora é estorno.
          const estorno = await this.pagamentos.estornar(p)
          situacao = { ...situacao, status: 'estornado', bruto: estorno.bruto }
        }
        situacoes.set(p.id, situacao)
      } else if (p.status === StatusPagamento.APROVADO) {
        const estorno = await this.pagamentos.estornar(p)
        situacoes.set(p.id, { status: 'estornado', bruto: estorno.bruto })
      }
    }

    return situacoes
  }

  /** O número da venda é o documento das saídas dela — único por empresa. */
  private async devolverAosLotes(
    tx: Transacao,
    empresaId: string,
    usuario: string,
    venda: { id: string; numero: string; lojaId: string },
    motivo: string | undefined,
    agora: Date,
  ) {
    const local = await this.nucleo.localDaLoja(tx, empresaId, venda.lojaId)
    const saidas = await tx.movimentacaoEstoque.findMany({
      where: { empresaId, tipo: TipoMovimentacao.VENDA, documento: venda.numero },
    })

    for (const saida of saidas) {
      const quantidade = Math.abs(numero(saida.quantidade))

      await this.nucleo.aplicarSaldo(tx, {
        empresaId,
        produtoId: saida.produtoId,
        loteId: saida.loteId,
        localId: local.id,
        delta: quantidade,
      })

      await this.nucleo.registrarMovimentacao(tx, {
        empresaId,
        tipo: TipoMovimentacao.DEVOLUCAO,
        produtoId: saida.produtoId,
        loteId: saida.loteId,
        quantidade,
        origemId: null,
        origemLabel: 'Cliente',
        destinoId: local.id,
        destinoLabel: local.nome,
        usuario,
        observacao: motivo?.trim() || `Cancelamento da venda ${venda.numero}`,
        documento: venda.numero,
        custoUnitario: numeroOuNulo(saida.custoUnitario),
        valorTotal: numeroOuNulo(saida.valorTotal),
        data: agora,
      })
    }
  }

  /* ---------------------------------------------------------------- */
  /* Internos                                                          */
  /* ---------------------------------------------------------------- */

  /** Compare-and-set da situação do provedor, em transação própria. */
  private aplicar(pagamentoId: string, situacao: SituacaoPagamento): Promise<boolean> {
    return this.nucleo.executar((tx) => this.pagamentos.aplicarSituacao(tx, pagamentoId, situacao))
  }

  private async pagamentoDaVenda(empresaId: string, vendaId: string, pagamentoId: string) {
    const pagamento = await this.prisma.pagamento.findFirst({
      where: { id: pagamentoId, vendaId, empresaId },
    })
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado.')
    return pagamento
  }

  private async situacaoPagamento(empresaId: string, vendaId: string, pagamentoId: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { id: vendaId, empresaId },
      include: INCLUIR,
    })
    if (!venda) throw new NotFoundException('Venda não encontrada.')
    const pagamento = venda.pagamentos.find((p) => p.id === pagamentoId)
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado.')

    return { pagamento: this.pagamentoParaContrato(pagamento), venda: this.paraContrato(venda) }
  }

  /**
   * Idempotência da criação: mesma chave, mesma venda.
   *
   * Há um check antes da transação, para responder rápido, e o índice único
   * cobre a corrida entre duas requisições simultâneas — a que perde recebe
   * `P2002`, e a resposta certa é a venda que a outra gravou.
   */
  private async comChave<T extends { repetida: boolean }>(
    empresaId: string,
    chaveBruta: string | undefined,
    criar: (chave: string | null) => Promise<T>,
  ): Promise<T | { venda: ReturnType<VendasService['paraContrato']>; repetida: true }> {
    const chave = chaveBruta?.trim() || null

    if (chave) {
      const existente = await this.repetida(empresaId, chave)
      if (existente) return existente
    }

    try {
      return await criar(chave)
    } catch (erro) {
      if (chave && violouUnico(erro, 'chave_idempotencia')) {
        const existente = await this.repetida(empresaId, chave)
        if (existente) return existente
      }
      throw erro
    }
  }

  private async repetida(empresaId: string, chaveIdempotencia: string) {
    const existente = await this.prisma.venda.findFirst({
      where: { empresaId, chaveIdempotencia },
      include: INCLUIR,
    })
    return existente ? { venda: this.paraContrato(existente), repetida: true as const } : null
  }

  private async insuficiente(tx: Transacao, vendaId: string) {
    const venda = await tx.venda.findUniqueOrThrow({
      where: { id: vendaId },
      include: { pagamentos: true },
    })
    const faltam = arredondar(
      numero(venda.total) -
        somar(venda.pagamentos.filter((p) => p.status === StatusPagamento.APROVADO)),
    )
    return new ConflictException(`Pagamento insuficiente: faltam ${formatarMoeda(faltam)}.`)
  }

  private async lojaPadrao(tx: Transacao, empresaId: string): Promise<string> {
    const loja = await tx.loja.findFirst({
      where: { empresaId, ativa: true },
      orderBy: { criadoEm: 'asc' },
      select: { id: true },
    })
    if (!loja) throw new NotFoundException('Nenhuma loja cadastrada nesta empresa.')
    return loja.id
  }

  private async buscar(empresaId: string, consulta: ConsultaVendasDto) {
    return this.prisma.venda.findMany({
      where: this.filtro(empresaId, consulta),
      include: INCLUIR,
      orderBy: { data: 'desc' },
    })
  }

  /** Mesma duração do período consultado, imediatamente antes dele. */
  private async buscarPeriodoAnterior(empresaId: string, consulta: ConsultaVendasDto) {
    const fim = consulta.ate ? new Date(`${consulta.ate}T23:59:59`) : new Date()
    const inicio = consulta.de
      ? new Date(`${consulta.de}T00:00:00`)
      : new Date(fim.getTime() - 30 * DIA_MS)
    const duracao = fim.getTime() - inicio.getTime()

    return this.prisma.venda.findMany({
      where: {
        ...this.filtro(empresaId, { ...consulta, de: undefined, ate: undefined }),
        data: { gte: new Date(inicio.getTime() - duracao), lt: inicio },
      },
      include: INCLUIR,
    })
  }

  private filtro(empresaId: string, consulta: ConsultaVendasDto): Prisma.VendaWhereInput {
    const where: Prisma.VendaWhereInput = { empresaId }

    if (consulta.lojaId) where.lojaId = consulta.lojaId

    // Venda aberta é carrinho aguardando pagamento: só aparece se pedida.
    if (consulta.status && consulta.status !== 'todos') {
      where.status = paraEnum<StatusVenda>(consulta.status)
    } else {
      where.status = { not: StatusVenda.ABERTA }
    }

    if (consulta.formaPagamento && consulta.formaPagamento !== 'todas') {
      where.pagamentos = {
        some: {
          forma: paraEnum<FormaPagamentoVenda>(consulta.formaPagamento),
          status: { in: [StatusPagamento.APROVADO, StatusPagamento.ESTORNADO] },
        },
      }
    }

    if (consulta.de || consulta.ate) {
      where.data = {
        ...(consulta.de ? { gte: new Date(`${consulta.de}T00:00:00`) } : {}),
        ...(consulta.ate ? { lte: new Date(`${consulta.ate}T23:59:59`) } : {}),
      }
    }
    return where
  }

  private pagamentoParaContrato(p: PagamentoLinha) {
    return {
      id: p.id,
      forma: p.forma.toLowerCase().replace(/_/g, '-') as never,
      valor: numero(p.valor),
      status: p.status.toLowerCase() as never,
      parcelas: p.parcelas,
      provedor: p.provedor,
      autorizacao: p.autorizacao,
      nsu: p.nsu,
      bandeira: p.bandeira,
      ultimosDigitos: p.ultimosDigitos,
      motivoRecusa: p.motivoRecusa,
      criadoEm: p.criadoEm.toISOString(),
      confirmadoEm: p.confirmadoEm?.toISOString() ?? null,
    }
  }

  private paraContrato(venda: VendaCompleta) {
    return {
      id: venda.id,
      numero: venda.numero,
      lojaId: venda.lojaId,
      lojaNome: venda.loja?.nome ?? '—',
      data: venda.data.toISOString(),
      clienteNome: venda.clienteNome,
      operador: venda.operador,
      itens: venda.itens.map((i) => ({
        id: i.id,
        produtoId: i.produtoId,
        produtoNome: i.produtoNome,
        ean: i.ean,
        imagem: i.imagem,
        quantidade: numero(i.quantidade),
        precoUnitario: numero(i.precoUnitario),
        total: numero(i.total),
      })),
      subtotal: numero(venda.subtotal),
      desconto: numero(venda.desconto),
      acrescimo: numero(venda.acrescimo),
      total: numero(venda.total),
      pagamentos: venda.pagamentos.map((p) => this.pagamentoParaContrato(p)),
      troco: numero(venda.troco),
      tipoVenda: venda.tipoVenda,
      canal: venda.canal,
      observacao: venda.observacao,
      status: venda.status.toLowerCase() as never,
      concluidaEm: venda.concluidaEm?.toISOString() ?? null,
      registradoEm: venda.criadoEm.toISOString(),
      atualizadoEm: venda.atualizadoEm.toISOString(),
      idInterno: venda.id,
      totalItens: venda.itens.reduce((acc, i) => acc + numero(i.quantidade), 0),
    }
  }
}

/**
 * Sem base anterior não há percentual: devolve `undefined` para o card omitir
 * a linha. Zero afirmaria estabilidade onde não houve com o que comparar —
 * mesmo critério aplicado no resumo da Loja.
 */
function variacao(atual: number, anterior: number): number | undefined {
  if (!anterior) return undefined
  return ((atual - anterior) / anterior) * 100
}

/** Contrato em minúsculas com hífen -> enum do Prisma (`cartao-debito` -> `CARTAO_DEBITO`). */
function paraEnum<T>(valor: string): T {
  return valor.toUpperCase().replace(/-/g, '_') as T
}

function arredondar(valor: number): number {
  return Number(valor.toFixed(2))
}

function somar(pagamentos: Array<{ valor: Prisma.Decimal | number }>): number {
  return arredondar(pagamentos.reduce((acc, p) => acc + numero(p.valor), 0))
}

function formatarMoeda(valor: number | Prisma.Decimal): string {
  return `R$ ${numero(valor).toFixed(2).replace('.', ',')}`
}

/**
 * Violação de índice único do Prisma em uma coluna específica. O `target`
 * pode vir como nome de coluna ou de campo, então a comparação ignora caixa
 * e sublinhado.
 */
function violouUnico(erro: unknown, coluna: string): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== 'P2002') return false
  const alvo = (erro.meta as { target?: string[] | string } | undefined)?.target
  const campos = Array.isArray(alvo) ? alvo : alvo ? [alvo] : []
  const chave = (s: string) => s.replace(/_/g, '').toLowerCase()
  return campos.some((c) => chave(c) === chave(coluna))
}

function paginar<T>(itens: T[], pagina = 1, porPagina = 10) {
  const total = itens.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const atual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (atual - 1) * porPagina

  return {
    itens: itens.slice(inicio, inicio + porPagina),
    total,
    pagina: atual,
    porPagina,
    totalPaginas,
  }
}
