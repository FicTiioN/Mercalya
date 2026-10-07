import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { VendasService } from './vendas.service'
import { ConsultaVendasDto } from './dto/consulta-vendas.dto'
import { AbrirVendaDto, RegistrarVendaDto } from './dto/registrar-venda.dto'
import { CancelarVendaDto } from './dto/cancelar-venda.dto'
import { NovoPagamentoDto } from './dto/novo-pagamento.dto'

@Controller('vendas')
export class VendasController {
  constructor(private readonly vendas: VendasService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaVendasDto) {
    return this.vendas.listar(empresaId, consulta)
  }

  @Get('resumo')
  resumo(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaVendasDto) {
    return this.vendas.resumo(empresaId, consulta)
  }

  @Get('lojas')
  lojas(@EmpresaAtual() empresaId: string) {
    return this.vendas.lojas(empresaId)
  }

  @Get(':id')
  obter(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.vendas.obter(empresaId, id)
  }

  @Get(':id/historico')
  historico(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.vendas.historico(empresaId, id)
  }

  /** Balcão: venda já paga, em uma chamada. */
  @Post()
  registrar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: RegistrarVendaDto,
  ) {
    return this.vendas.registrar(empresaId, usuario.nome, entrada)
  }

  /** Totem: abre o carrinho sem pagamento. Estoque intacto. */
  @Post('abrir')
  abrir(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: AbrirVendaDto,
  ) {
    return this.vendas.abrirVenda(empresaId, usuario.nome, entrada)
  }

  /** Roda a conciliação agora, só para esta empresa. Também roda sozinha a cada minuto. */
  @Post('conciliar')
  conciliar(@EmpresaAtual() empresaId: string) {
    return this.vendas.conciliar(empresaId)
  }

  /** Manual nasce aprovado; por provedor nasce pendente e aciona a maquininha. */
  @Post(':id/pagamentos')
  adicionarPagamento(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Param('id') id: string,
    @Body() entrada: NovoPagamentoDto,
  ) {
    return this.vendas.adicionarPagamento(empresaId, usuario.nome, id, entrada)
  }

  /** O totem faz polling aqui. Sincroniza com o provedor e conclui a venda se coberta. */
  @Get(':id/pagamentos/:pagamentoId')
  sincronizarPagamento(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Param('id') id: string,
    @Param('pagamentoId') pagamentoId: string,
  ) {
    return this.vendas.sincronizarPagamento(empresaId, usuario.nome, id, pagamentoId)
  }

  /** O cliente desistiu antes de aproximar o cartão. */
  @Post(':id/pagamentos/:pagamentoId/abortar')
  abortarPagamento(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Param('id') id: string,
    @Param('pagamentoId') pagamentoId: string,
  ) {
    return this.vendas.abortarPagamento(empresaId, usuario.nome, id, pagamentoId)
  }

  /** Devolve a mercadoria à prateleira nos mesmos lotes e estorna os pagamentos. */
  @Post(':id/cancelar')
  cancelar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Param('id') id: string,
    @Body() corpo: CancelarVendaDto,
  ) {
    return this.vendas.cancelar(empresaId, usuario.nome, id, corpo.motivo)
  }
}
