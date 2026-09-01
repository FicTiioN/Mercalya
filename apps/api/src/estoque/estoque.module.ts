import { Global, Module } from '@nestjs/common'
import { NucleoEstoqueService } from './nucleo.service'
import { EstoqueService } from './estoque.service'
import { HistoricoService } from './historico.service'
import { EstoqueController } from './estoque.controller'

/**
 * Global: compras, abastecimento, perdas e ajustes compartilham as mesmas
 * primitivas de estoque. Uma segunda implementacao seria uma segunda verdade.
 */
@Global()
@Module({
  controllers: [EstoqueController],
  providers: [NucleoEstoqueService, EstoqueService, HistoricoService],
  exports: [NucleoEstoqueService, EstoqueService, HistoricoService],
})
export class EstoqueModule {}
