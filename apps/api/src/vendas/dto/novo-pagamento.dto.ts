import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

const FORMAS = ['pix', 'dinheiro', 'cartao-debito', 'cartao-credito'] as const

/** Um pagamento adicionado a uma venda aberta. */
export class NovoPagamentoDto {
  @IsIn(FORMAS)
  forma!: (typeof FORMAS)[number]

  @Type(() => Number) @IsNumber() @Min(0.01)
  valor!: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24)
  parcelas?: number

  /**
   * "manual" (padrão): o operador recebeu e está registrando. Qualquer outro
   * nome é um provedor — o pagamento nasce pendente e a maquininha decide.
   * Não é enum de propósito: o provedor real entra sem mudar este DTO.
   */
  @IsOptional() @IsString() @MaxLength(32)
  provedor?: string

  /** Repetir a chave devolve o mesmo pagamento; o provedor não é acionado de novo. */
  @IsOptional() @IsString() @MaxLength(64)
  chaveIdempotencia?: string
}
