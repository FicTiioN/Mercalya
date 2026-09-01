import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Response } from 'express'

/**
 * Traduz erros do Prisma em respostas com significado.
 *
 * Sem isto, uma violação de índice único ou um valor fora de faixa chega ao
 * cliente como "Internal server error" — o usuário não sabe o que fazer e quem
 * for depurar não sabe o que aconteceu. O log continua guardando o erro cru;
 * o que muda é o que atravessa a fronteira.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExcecaoFilter implements ExceptionFilter {
  private readonly logger = new Logger('Prisma')

  catch(
    excecao: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const res = host.switchToHttp().getResponse<Response>()

    if (excecao instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(excecao.message)
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Dados inválidos para esta operação.',
      })
    }

    const { status, message } = this.traduzir(excecao)
    this.logger.error(`${excecao.code}: ${excecao.message.split('\n').pop()}`)

    return res.status(status).json({ statusCode: status, error: rotulo(status), message })
  }

  private traduzir(erro: Prisma.PrismaClientKnownRequestError): {
    status: number
    message: string
  } {
    switch (erro.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `Já existe um registro com este ${alvo(erro)}.`,
        }
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Registro vinculado a outro que não existe ou não pode ser removido.',
        }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' }
      // Valor fora da faixa da coluna — quantidade ou preço absurdo.
      case 'P2020':
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Valor fora da faixa aceita para este campo.',
        }
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Não foi possível concluir a operação.',
        }
    }
  }
}

/** Nome do campo que violou o índice único, quando o Prisma informa. */
function alvo(erro: Prisma.PrismaClientKnownRequestError): string {
  const meta = erro.meta as { target?: string[] | string } | undefined
  const campos = Array.isArray(meta?.target) ? meta?.target : meta?.target ? [meta.target] : []
  const util = campos.filter((c) => c !== 'empresa_id')
  return util.length > 0 ? util.join(' + ') : 'valor'
}

function rotulo(status: number): string {
  if (status === HttpStatus.CONFLICT) return 'Conflict'
  if (status === HttpStatus.NOT_FOUND) return 'Not Found'
  if (status === HttpStatus.BAD_REQUEST) return 'Bad Request'
  return 'Internal Server Error'
}
