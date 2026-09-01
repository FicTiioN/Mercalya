import type { PapelUsuario } from '@prisma/client'

/**
 * Conteúdo do JWT.
 *
 * `empresaId` viaja no token de propósito: é o que permite ao guard injetar o
 * tenant em toda requisição sem uma consulta extra ao banco, e sem que nenhum
 * endpoint dependa de o cliente informar de qual empresa está falando.
 */
export interface PayloadJwt {
  sub: string
  empresaId: string
  email: string
  nome: string
  papel: PapelUsuario
}

/** O que o guard anexa à requisição depois de validar o token. */
export interface UsuarioRequisicao {
  id: string
  empresaId: string
  email: string
  /** Carimbado no histórico de movimentações — quem fez a operação. */
  nome: string
  papel: PapelUsuario
}

declare module 'express' {
  interface Request {
    usuario?: UsuarioRequisicao
  }
}
