import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { EstoqueService } from './estoque.service'
import { HistoricoService } from './historico.service'
import { ConsultaEstoqueDto } from './dto/consulta-estoque.dto'
import { AbastecerDto } from './dto/abastecer.dto'
import { RegistrarPerdaDto } from './dto/registrar-perda.dto'
import { AjustarSaldoDto } from './dto/ajustar-saldo.dto'
import { ConsultaPerdasDto } from './dto/consulta-perdas.dto'
import { ConsultaMovimentacoesDto } from './dto/consulta-movimentacoes.dto'

@Controller()
export class EstoqueController {
  constructor(
    private readonly estoque: EstoqueService,
    private readonly historico: HistoricoService,
  ) {}

  /* ------------------------------ estoque ------------------------------ */

  @Get('locais')
  locais(@EmpresaAtual() empresaId: string) {
    return this.estoque.locais(empresaId)
  }

  @Get('estoque/lotes')
  lotes(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaEstoqueDto) {
    return this.estoque.listarLotes(empresaId, consulta)
  }

  @Get('estoque/resumo')
  resumoEstoque(@EmpresaAtual() empresaId: string, @Query('localId') localId?: string) {
    return this.estoque.resumo(empresaId, localId)
  }

  @Patch('estoque/ajustar')
  ajustar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: AjustarSaldoDto,
  ) {
    return this.estoque.ajustar(empresaId, usuario.nome, entrada)
  }

  /* --------------------------- abastecimento --------------------------- */

  @Get('abastecimento/sugestoes')
  sugestoes(@EmpresaAtual() empresaId: string, @Query('lojaId') lojaId?: string) {
    return this.estoque.sugestoes(empresaId, lojaId)
  }

  @Get('abastecimento/sugestoes/resumo')
  resumoSugestoes(@EmpresaAtual() empresaId: string, @Query('lojaId') lojaId?: string) {
    return this.estoque.resumoSugestoes(empresaId, lojaId)
  }

  @Get('abastecimento/origem-destino')
  origemDestino(@EmpresaAtual() empresaId: string, @Query('lojaId') lojaId?: string) {
    return this.estoque.origemDestino(empresaId, lojaId)
  }

  @Get('abastecimento/disponiveis')
  disponiveis(
    @EmpresaAtual() empresaId: string,
    @Query('busca') busca?: string,
    @Query('lojaId') lojaId?: string,
  ) {
    return this.estoque.produtosDisponiveis(empresaId, busca ?? '', lojaId)
  }

  @Get('abastecimento/recentes')
  recentes(@EmpresaAtual() empresaId: string, @Query('limite') limite?: string) {
    return this.estoque.abastecimentosRecentes(empresaId, Number(limite) || 5)
  }

  /** Transferencia central -> loja. O total da empresa nao muda. */
  @Post('abastecimento/confirmar')
  abastecer(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: AbastecerDto,
  ) {
    return this.estoque.abastecer(empresaId, usuario.nome, entrada)
  }

  /* -------------------------------- perdas ----------------------------- */

  @Get('perdas')
  listarPerdas(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaPerdasDto) {
    return this.historico.listarPerdas(empresaId, consulta)
  }

  @Get('perdas/resumo')
  resumoPerdas(@EmpresaAtual() empresaId: string) {
    return this.historico.resumoPerdas(empresaId)
  }

  @Get('perdas/vencimentos')
  vencimentos(@EmpresaAtual() empresaId: string, @Query('limite') limite?: string) {
    return this.historico.proximosVencimentos(empresaId, Number(limite) || 5)
  }

  @Get('perdas/top')
  topPerdas(@EmpresaAtual() empresaId: string, @Query('limite') limite?: string) {
    return this.historico.topPerdas(empresaId, Number(limite) || 5)
  }

  /* ---------------------------- movimentacoes -------------------------- */

  @Get('movimentacoes')
  movimentacoes(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaMovimentacoesDto) {
    return this.historico.listarMovimentacoes(empresaId, consulta)
  }

  @Get('movimentacoes/resumo')
  resumoMovimentacoes(@EmpresaAtual() empresaId: string) {
    return this.historico.resumoMovimentacoes(empresaId)
  }

  @Get('movimentacoes/usuarios')
  usuariosMov(@EmpresaAtual() empresaId: string) {
    return this.historico.usuariosDeMovimentacao(empresaId)
  }

  @Get('movimentacoes/:id/historico')
  historicoMov(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.historico.historicoMovimentacao(empresaId, id)
  }

  @Post('perdas')
  registrarPerda(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: RegistrarPerdaDto,
  ) {
    return this.estoque.registrarPerda(empresaId, usuario.nome, entrada)
  }
}
