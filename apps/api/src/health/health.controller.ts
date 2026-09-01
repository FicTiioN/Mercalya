import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { Publico } from '../auth/decorators'

@Publico()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: o processo está de pé. Não toca no banco de propósito. */
  @Get()
  @HttpCode(HttpStatus.OK)
  vivo() {
    return { status: 'ok', servico: 'mercalya-api' }
  }

  /**
   * Readiness: só responde 200 se o banco responder.
   * Devolve 503 quando não — é o que um balanceador precisa para parar de
   * mandar tráfego.
   */
  @Get('ready')
  async pronto(@Res({ passthrough: true }) res: Response) {
    const { conectado, erro } = await this.prisma.verificarConexao()

    res.status(conectado ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)

    return {
      status: conectado ? 'ok' : 'indisponivel',
      banco: conectado ? 'conectado' : 'sem conexao',
      detalhe: erro,
    }
  }
}
