import { ConflictException } from '@nestjs/common'

/**
 * Falta de saldo ao concluir uma venda.
 *
 * É um `ConflictException` como os outros — o cliente HTTP recebe 409 — mas
 * com tipo próprio porque um caller precisa distingui-lo: quando o pagamento
 * já foi aprovado na maquininha e o estoque acabou no meio, a resposta certa
 * não é "erro", é estornar.
 */
export class EstoqueInsuficienteException extends ConflictException {}
