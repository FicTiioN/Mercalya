import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/** Global: todo módulo de domínio precisa do Prisma, importar em cada um é ruído. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
