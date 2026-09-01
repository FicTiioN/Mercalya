import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { PayloadJwt } from './tipos'

export interface UsuarioSessao {
  id: string
  nome: string
  iniciais: string
  funcao: string
  email: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<{ token: string; usuario: UsuarioSessao }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // Mesma resposta para e-mail inexistente, senha errada e usuário inativo:
    // qualquer diferença vira um oráculo para descobrir quem tem conta.
    const senhaConfere = usuario ? await compare(senha, usuario.senhaHash) : false
    if (!usuario || !usuario.ativo || !senhaConfere) {
      throw new UnauthorizedException('E-mail ou senha incorretos.')
    }

    const payload: PayloadJwt = {
      sub: usuario.id,
      empresaId: usuario.empresaId,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel,
    }

    return {
      token: await this.jwt.signAsync(payload),
      usuario: montarSessao(usuario),
    }
  }

  /** Contexto completo da sessão: quem sou, de qual empresa e em quais lojas opero. */
  async contexto(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId, ativo: true },
    })
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.')

    const [empresa, lojas] = await Promise.all([
      this.prisma.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: { id: true, nome: true },
      }),
      this.prisma.loja.findMany({
        where: { empresaId, ativa: true },
        select: { id: true, nome: true, condominio: true },
        orderBy: { nome: 'asc' },
      }),
    ])

    return { usuario: montarSessao(usuario), empresa, lojas }
  }
}

function montarSessao(usuario: {
  id: string
  nome: string
  email: string
  papel: string
}): UsuarioSessao {
  return {
    id: usuario.id,
    nome: usuario.nome,
    iniciais: iniciaisDe(usuario.nome),
    funcao: usuario.papel === 'ADMINISTRADOR' ? 'Administrador' : usuario.papel,
    email: usuario.email,
  }
}

/** Primeira e última inicial — "João Silva" vira "JS". */
function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
