import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

export class CriarLojaDto {
  @IsString() @MaxLength(80)
  nome!: string

  @IsOptional() @IsString() @MaxLength(120)
  condominio?: string
}

export class AtualizarLojaDto {
  @IsOptional() @IsString() @MaxLength(80)
  nome?: string

  @IsOptional() @IsString() @MaxLength(120)
  condominio?: string

  /** Loja inativa não aparece no seletor nem recebe venda; o histórico dela fica. */
  @IsOptional() @IsBoolean()
  ativa?: boolean
}
