import { Module } from '@nestjs/common'
import { EstoqueModule } from '../estoque/estoque.module'
import { PainelController } from './painel.controller'
import { PainelService } from './painel.service'
import { InicioService } from './inicio.service'
import { NotificacaoService } from './notificacao.service'

@Module({
  imports: [EstoqueModule],
  controllers: [PainelController],
  providers: [PainelService, InicioService, NotificacaoService],
})
export class PainelModule {}
