import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { CHAVE_PUBLICO } from './decorators'
import type { PayloadJwt } from './tipos'

/**
 * Guard global: **nega por padrão**. Só passa sem token a rota marcada com
 * `@Publico()`.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ])
    if (publico) return true

    const req = contexto.switchToHttp().getRequest<Request>()
    const token = extrairToken(req)
    if (!token) throw new UnauthorizedException('Token ausente.')

    try {
      const payload = await this.jwt.verifyAsync<PayloadJwt>(token)
      req.usuario = {
        id: payload.sub,
        empresaId: payload.empresaId,
        email: payload.email,
        // Token emitido antes de `nome` existir no payload: o e-mail serve de
        // rótulo até a sessão ser renovada.
        nome: payload.nome ?? payload.email,
        papel: payload.papel,
      }
      return true
    } catch {
      // A mensagem é genérica de propósito: distinguir "expirado" de "inválido"
      // entrega informação a quem está tentando adivinhar.
      throw new UnauthorizedException('Sessão inválida ou expirada.')
    }
  }
}

function extrairToken(req: Request): string | null {
  const cabecalho = req.headers.authorization
  if (!cabecalho) return null
  const [tipo, valor] = cabecalho.split(' ')
  return tipo === 'Bearer' && valor ? valor : null
}
