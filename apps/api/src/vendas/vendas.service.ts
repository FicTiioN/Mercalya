import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
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
import { numero, numeroOuNulo } from '../comum/numero'
import { normalizar } from '../comum/texto'
import type { ConsultaVendasDto } from './dto/consulta-vendas.dto'
import type { PagamentoVendaDto, RegistrarVendaDto } from './dto/registrar-venda.dto'

const DIA_MS = 86_400_000

const ROTULOS_PAGAMENTO: Record<FormaPagamentoVenda, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
}

/** Operador registrou o recebimento — não passou por maquininha. */
const PROVEDOR_MANUAL = 'manual'

const INCLUIR = {
  itens: true,
  loja: true,
  pagamentos: { orderBy: { criadoEm: 'asc' } },
} satisfies Prisma.VendaInclude

type VendaCompleta = Prisma.VendaGetPayload<{ include: typeof INCLUIR }>

interface EventoVenda {
  icone: 'venda' | 'pagamento' | 'comprovante' | 'cancelamento'
  titulo: string
  descricao: string
  quando: string
  autor: string
}

@Injectable()
export class VendasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nucleo: NucleoEstoqueService,
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
      const quando = (p.confirmadoEm ?? p.criadoEm).toISOString()

      switch (p.status) {
        case StatusPagamento.APROVADO:
        case StatusPagamento.ESTORNADO:
          eventos.push({
            icone: 'pagamento',
            titulo: 'Pagamento aprovado',
            descricao: `${formatarMoeda(p.valor)} em ${forma}${via}.`,
            quando,
            autor: venda.operador,
          })
          break
        case StatusPagamento.RECUSADO:
          eventos.push({
            icone: 'cancelamento',
            titulo: 'Pagamento recusado',
            descricao: p.motivoRecusa || `${formatarMoeda(p.valor)} em ${forma} não foi aprovado.`,
            quando,
            autor: venda.operador,
          })
          break
        case StatusPagamento.PENDENTE:
          eventos.push({
            icone: 'pagamento',
            titulo: 'Aguardando pagamento',
            descricao: `${formatarMoeda(p.valor)} em ${forma}${via}.`,
            quando,
            autor: venda.operador,
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
          : 'O pagamento não foi aprovado.',
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
  /* Registro — a única saída de estoque por venda                     */
  /* ---------------------------------------------------------------- */

  /**
   * Registra uma venda **já paga**: o operador confirma que recebeu, e a API
   * grava venda, itens, pagamentos e a baixa do estoque da loja em uma
   * transação só. Se a baixa falhar por falta de saldo, nada fica — nem a
   * venda, nem o pagamento.
   *
   * São dois passos internos de propósito: `abrir` congela itens e preços sem
   * tocar no estoque; `concluir` debita. Com maquininha, entre um e outro
   * existe uma espera — e a venda fica ABERTA enquanto o cliente aproxima o
   * cartão. Aqui os dois acontecem no mesmo commit.
   */
  async registrar(empresaId: string, usuario: string, entrada: RegistrarVendaDto) {
    const chave = entrada.chaveIdempotencia?.trim() || null

    // Idempotência: mesma chave, mesma venda. O índice único cobre a corrida
    // entre duas requisições simultâneas; este check só evita abrir transação.
    if (chave) {
      const existente = await this.repetida(empresaId, chave)
      if (existente) return existente
    }

    let vendaId: string
    try {
      vendaId = await this.nucleo.executar(async (tx) => {
        const venda = await this.abrir(tx, empresaId, usuario, entrada, chave)
        await this.receberPagamentos(tx, empresaId, venda, entrada.pagamentos)
        await this.concluir(tx, empresaId, usuario, venda.id)
        return venda.id
      })
    } catch (erro) {
      // Duas requisições com a mesma chave chegaram juntas: a segunda perdeu a
      // corrida no índice único. A resposta certa é a venda que a primeira gravou.
      if (chave && violouUnico(erro, 'chave_idempotencia')) {
        const existente = await this.repetida(empresaId, chave)
        if (existente) return existente
      }
      throw erro
    }

    return { venda: await this.obter(empresaId, vendaId), repetida: false }
  }

  /**
   * Cancela uma venda devolvendo a mercadoria à prateleira **nos mesmos lotes**
   * de onde saiu. A movimentação `VENDA` guarda o lote, então a devolução não é
   * estimativa — é o inverso exato da baixa.
   *
   * Pagamentos aprovados ficam ESTORNADOS. Nesta fase todos são manuais: o
   * operador devolve o dinheiro. Com maquininha, é aqui que o estorno é pedido
   * ao provedor.
   */
  async cancelar(empresaId: string, usuario: string, id: string, motivo?: string) {
    const vendaId = await this.nucleo.executar(async (tx) => {
      const venda = await tx.venda.findFirst({
        where: { empresaId, OR: [{ id }, { numero: id }] },
      })
      if (!venda) throw new NotFoundException('Venda não encontrada.')
      if (venda.status === StatusVenda.CANCELADA) {
        throw new ConflictException('Esta venda já foi cancelada.')
      }

      const agora = new Date()

      if (venda.status === StatusVenda.CONCLUIDA) {
        const local = await this.nucleo.localDaLoja(tx, empresaId, venda.lojaId)

        // O número da venda é o documento das movimentações que ela gerou —
        // é único por empresa, então identifica exatamente as saídas dela.
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

      return venda.id
    })

    return this.obter(empresaId, vendaId)
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
    entrada: RegistrarVendaDto,
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
   * Grava os pagamentos que o operador declarou ter recebido.
   *
   * A soma precisa cobrir o total. O que passar vira troco — e só dinheiro
   * gera troco: um cartão "cobrado a mais" seria um erro, não uma sobra.
   */
  private async receberPagamentos(
    tx: Transacao,
    empresaId: string,
    venda: { id: string; total: Prisma.Decimal },
    pagamentos: PagamentoVendaDto[],
  ) {
    const total = numero(venda.total)
    const soma = arredondar(pagamentos.reduce((acc, p) => acc + p.valor, 0))

    if (soma < total) {
      throw new ConflictException(
        `Pagamento insuficiente: faltam ${formatarMoeda(arredondar(total - soma))}.`,
      )
    }

    const troco = arredondar(soma - total)
    const emDinheiro = arredondar(
      pagamentos.filter((p) => p.forma === 'dinheiro').reduce((acc, p) => acc + p.valor, 0),
    )
    if (troco > 0 && troco > emDinheiro) {
      throw new ConflictException('Só pagamento em dinheiro pode gerar troco.')
    }

    const agora = new Date()
    await tx.pagamento.createMany({
      data: pagamentos.map((p) => ({
        empresaId,
        vendaId: venda.id,
        forma: paraEnum<FormaPagamentoVenda>(p.forma),
        valor: arredondar(p.valor),
        parcelas: p.parcelas ?? 1,
        status: StatusPagamento.APROVADO,
        provedor: PROVEDOR_MANUAL,
        confirmadoEm: agora,
      })),
    })

    if (troco > 0) {
      await tx.venda.update({ where: { id: venda.id }, data: { troco } })
    }
  }

  /**
   * Debita o estoque da loja por FEFO e fecha a venda. **Só aqui a mercadoria
   * sai** — e só de uma venda ABERTA.
   */
  private async concluir(tx: Transacao, empresaId: string, usuario: string, vendaId: string) {
    const venda = await tx.venda.findUniqueOrThrow({
      where: { id: vendaId },
      include: { itens: true },
    })
    if (venda.status !== StatusVenda.ABERTA) {
      throw new ConflictException('Esta venda já foi concluída ou cancelada.')
    }

    const local = await this.nucleo.localDaLoja(tx, empresaId, venda.lojaId)
    const agora = new Date()

    // Confere tudo antes de mover: recusar no meio deixaria o operador sem
    // saber quais itens passaram — mesmo com o rollback resolvendo o dado.
    for (const item of venda.itens) {
      const disponivel = await this.nucleo.disponivelNoLocal(tx, item.produtoId, local.id)
      if (numero(item.quantidade) > disponivel) {
        throw new ConflictException(
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

    await tx.venda.update({
      where: { id: vendaId },
      data: { status: StatusVenda.CONCLUIDA, concluidaEm: agora },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Internos                                                          */
  /* ---------------------------------------------------------------- */

  private async repetida(empresaId: string, chaveIdempotencia: string) {
    const existente = await this.prisma.venda.findFirst({
      where: { empresaId, chaveIdempotencia },
      include: INCLUIR,
    })
    return existente ? { venda: this.paraContrato(existente), repetida: true } : null
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
      pagamentos: venda.pagamentos.map((p) => ({
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
      })),
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
