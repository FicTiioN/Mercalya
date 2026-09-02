import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { EmpresaAtual, UsuarioAtual } from '../auth/decorators'
import type { UsuarioRequisicao } from '../auth/tipos'
import { VendasService } from './vendas.service'
import { ConsultaVendasDto } from './dto/consulta-vendas.dto'
import { RegistrarVendaDto } from './dto/registrar-venda.dto'
import { CancelarVendaDto } from './dto/cancelar-venda.dto'

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

  /** A única saída de estoque por venda do sistema. */
  @Post()
  registrar(
    @EmpresaAtual() empresaId: string,
    @UsuarioAtual() usuario: UsuarioRequisicao,
    @Body() entrada: RegistrarVendaDto,
  ) {
    return this.vendas.registrar(empresaId, usuario.nome, entrada)
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
