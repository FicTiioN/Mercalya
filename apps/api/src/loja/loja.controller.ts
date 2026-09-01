import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { LojaService } from './loja.service'
import { ConsultaLojaDto } from './dto/consulta-loja.dto'
import { RetirarDaLojaDto } from './dto/retirar-da-loja.dto'

@Controller('loja')
export class LojaController {
  constructor(private readonly loja: LojaService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaLojaDto) {
    return this.loja.listar(empresaId, consulta)
  }

  @Get('resumo')
  resumo(@EmpresaAtual() empresaId: string, @Query('lojaId') lojaId?: string) {
    return this.loja.resumo(empresaId, lojaId)
  }

  /** Devolve a mercadoria ao central. O total da empresa nao muda. */
  @Post('retirar')
  async retirar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: RetirarDaLojaDto,
  ) {
    await this.loja.retirar(empresaId, usuario.nome, entrada)
    return { ok: true }
  }
}
