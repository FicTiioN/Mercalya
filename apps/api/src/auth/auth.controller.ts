import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { Publico, UsuarioAtual } from './decorators'
import type { UsuarioRequisicao } from './tipos'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.senha)
  }

  /** Contexto da sessão. O front chama no boot para saber se o token vale. */
  @Get('eu')
  eu(@UsuarioAtual() usuario: UsuarioRequisicao) {
    return this.auth.contexto(usuario.id, usuario.empresaId)
  }
}
