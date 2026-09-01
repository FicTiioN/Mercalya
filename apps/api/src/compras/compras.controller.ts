import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { ComprasService } from './compras.service'
import { EntradaCompraDto } from './dto/entrada-compra.dto'
import { ConsultaBaseDto } from '../comum/consulta-base.dto'

@Controller('compras')
export class ComprasController {
  constructor(private readonly compras: ComprasService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaBaseDto) {
    return this.compras.listar(empresaId, consulta)
  }

  @Get('resumo')
  resumo(@EmpresaAtual() empresaId: string) {
    return this.compras.resumo(empresaId)
  }

  @Get(':id')
  obter(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.compras.obter(empresaId, id)
  }

  /** Confirmar e' a unica entrada de estoque do sistema. */
  @Post('confirmar')
  confirmar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: EntradaCompraDto,
  ) {
    return this.compras.confirmar(empresaId, usuario.nome, entrada)
  }
}
