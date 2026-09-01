import { Controller, Get, Param, Query } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { VendasService } from './vendas.service'
import { ConsultaVendasDto } from './dto/consulta-vendas.dto'

/**
 * Somente leitura nesta fase: o PDV que registra venda em tempo real ainda nao
 * existe. O historico veio do seed, ja debitando estoque.
 */
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
}
