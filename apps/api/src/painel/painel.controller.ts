import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { PainelService } from './painel.service'
import { InicioService } from './inicio.service'
import { NotificacaoService } from './notificacao.service'
import { FiltroPainelDto } from './dto/filtro-painel.dto'

@Controller()
export class PainelController {
  constructor(
    private readonly painel: PainelService,
    private readonly inicio: InicioService,
    private readonly notificacoes: NotificacaoService,
  ) {}

  /* -------------------------------- inicio ----------------------------- */

  @Get('inicio/resumo')
  resumoInicio(@EmpresaAtual() empresaId: string) {
    return this.inicio.resumo(empresaId)
  }

  @Get('inicio/dicas')
  dicas() {
    return this.inicio.dicas()
  }

  /* -------------------------------- painel ----------------------------- */

  @Get('painel')
  carregar(@EmpresaAtual() empresaId: string, @Query() filtro: FiltroPainelDto) {
    return this.painel.carregar(empresaId, filtro)
  }

  @Get('painel/lojas')
  lojas(@EmpresaAtual() empresaId: string) {
    return this.painel.lojas(empresaId)
  }

  /* ----------------------------- notificacoes -------------------------- */

  @Get('notificacoes')
  listar(@EmpresaAtual() empresaId: string, @UsuarioAtual() usuario: UsuarioRequisicao) {
    return this.notificacoes.listar(empresaId, usuario.id)
  }

  @Post('notificacoes/lidas')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marcar(
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body('chave') chave: string,
  ) {
    await this.notificacoes.marcarComoLida(usuario.id, chave)
  }

  @Post('notificacoes/lidas/todas')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marcarTodas(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
  ) {
    await this.notificacoes.marcarTodasComoLidas(empresaId, usuario.id)
  }
}
