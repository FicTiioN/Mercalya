import { IsIn, IsOptional, IsString } from 'class-validator'

const STATUS = ['todos', 'disponivel', 'estoque-baixo', 'indisponivel', 'nao-vendido'] as const

export class ConsultaLojaDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsString() lojaId?: string

  /** `nao-vendido` alcanca os produtos que a loja desativou. */
  @IsOptional() @IsIn(STATUS) status?: (typeof STATUS)[number]
}
