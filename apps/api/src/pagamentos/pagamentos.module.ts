import { Module } from '@nestjs/common'
import { ProvedorSimulado } from './simulado/provedor-simulado'
import { ProvedoresPagamento } from './porta/provedores.service'
import { PagamentosService } from './pagamentos.service'
import { PagamentosController } from './pagamentos.controller'

/**
 * Provedores de pagamento e a tradução para a linha de `pagamento`.
 *
 * Não importa Vendas — é Vendas que importa este. Quem sabe quando uma venda
 * está paga e o que fazer com o estoque é o serviço de vendas; este módulo só
 * fala com a maquininha.
 */
@Module({
  controllers: [PagamentosController],
  providers: [ProvedorSimulado, ProvedoresPagamento, PagamentosService],
  exports: [PagamentosService, ProvedoresPagamento, ProvedorSimulado],
})
export class PagamentosModule {}
