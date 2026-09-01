import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Cliente Prisma como provider único da aplicação.
 *
 * A conexão é tentada no boot, mas uma falha **não derruba o processo**: o
 * estado fica registrado e é o `/health/ready` que responde por ele. Assim a
 * API sobe com o banco fora do ar e diz claramente que não está pronta, em vez
 * de morrer no start e deixar o motivo só no log do orquestrador.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  private conectado = false
  private ultimoErro: string | null = null

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect()
      this.conectado = true
      this.ultimoErro = null
      this.logger.log('Conectado ao Postgres.')
    } catch (erro) {
      this.conectado = false
      this.ultimoErro = erro instanceof Error ? erro.message : String(erro)
      this.logger.warn(
        `Sem conexão com o Postgres. A API subiu, mas /health/ready vai acusar. Detalhe: ${this.ultimoErro}`,
      )
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  /** Faz um round-trip real: conexão viva no pool não prova banco respondendo. */
  async verificarConexao(): Promise<{ conectado: boolean; erro: string | null }> {
    try {
      await this.$queryRaw`SELECT 1`
      this.conectado = true
      this.ultimoErro = null
    } catch (erro) {
      this.conectado = false
      this.ultimoErro = erro instanceof Error ? erro.message : String(erro)
    }
    return { conectado: this.conectado, erro: this.ultimoErro }
  }
}
