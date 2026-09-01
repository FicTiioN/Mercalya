import { Type } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator'

/**
 * Corpo do PUT de configuracao por loja. Nao repete `lojaId`: ele ja vem na
 * URL, e aceitar os dois abriria a porta para divergirem.
 */
export class SalvarConfiguracaoDto {
  @Type(() => Number) @IsNumber() @Min(0)
  precoVenda!: number

  @Type(() => Number) @IsNumber() @Min(0)
  estoqueMinimo!: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estoqueIdeal?: number

  @IsBoolean()
  ativo!: boolean
}
