import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { ProdutosModule } from './produtos/produtos.module'
import { FornecedoresModule } from './fornecedores/fornecedores.module'
import { EstoqueModule } from './estoque/estoque.module'
import { ComprasModule } from './compras/compras.module'
import { LojaModule } from './loja/loja.module'
import { LojasModule } from './lojas/lojas.module'
import { VendasModule } from './vendas/vendas.module'
import { PainelModule } from './painel/painel.module'
import { JwtGuard } from './auth/jwt.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Liga os @Interval — hoje só a conciliação de pagamentos, a cada minuto.
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProdutosModule,
    FornecedoresModule,
    EstoqueModule,
    ComprasModule,
    LojaModule,
    LojasModule,
    VendasModule,
    PainelModule,
    HealthModule,
  ],
  providers: [
    // Guard global: toda rota exige token, exceto as marcadas com @Publico().
    { provide: APP_GUARD, useClass: JwtGuard },
  ],
})
export class AppModule {}
