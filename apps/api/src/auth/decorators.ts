import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import type { UsuarioRequisicao } from './tipos'

export const CHAVE_PUBLICO = 'rota_publica'

/**
 * Libera a rota do guard global.
 *
 * O padrão é o contrário — toda rota exige token. Esquecer de proteger um
 * endpoint deixaria dado exposto em silêncio; esquecer de marcar um como
 * público quebra na primeira chamada, bem visível.
 */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true)

/** Usuário autenticado da requisição. */
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioRequisicao => {
    const req = contexto.switchToHttp().getRequest<Request>()
    if (!req.usuario) throw new UnauthorizedException('Requisição sem usuário autenticado.')
    return req.usuario
  },
)

/**
 * Empresa dona da requisição, extraída do token.
 *
 * Os Services recebem `empresaId` como parâmetro **obrigatório**. É o que torna
 * impossível escrever uma consulta sem o filtro de tenant: não dá para chamar o
 * método sem passar o valor.
 */
export const EmpresaAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): string => {
    const req = contexto.switchToHttp().getRequest<Request>()
    if (!req.usuario) throw new UnauthorizedException('Requisição sem usuário autenticado.')
    return req.usuario.empresaId
  },
)
