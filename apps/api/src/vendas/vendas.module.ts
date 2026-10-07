import { Module } from '@nestjs/common'
import { PagamentosModule } from '../pagamentos/pagamentos.module'
import { VendasController } from './vendas.controller'
import { VendasService } from './vendas.service'
import { ConciliacaoService } from './conciliacao.service'

@Module({
  imports: [PagamentosModule],
  controllers: [VendasController],
  providers: [VendasService, ConciliacaoService],
  exports: [VendasService],
})
export class VendasModule {}
