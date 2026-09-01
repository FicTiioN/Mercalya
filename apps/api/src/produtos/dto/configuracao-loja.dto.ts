import { Type } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class ConfiguracaoLojaDto {
  @IsString()
  lojaId!: string

  @Type(() => Number) @IsNumber() @Min(0)
  precoVenda!: number

  @Type(() => Number) @IsNumber() @Min(0)
  estoqueMinimo!: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estoqueIdeal?: number

  @IsBoolean()
  ativo!: boolean
}
