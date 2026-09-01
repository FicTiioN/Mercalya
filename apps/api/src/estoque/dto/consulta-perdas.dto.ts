import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

const MOTIVOS = ['todos','vencimento','quebra','avaria','roubo','erro-operacional','outros'] as const

export class ConsultaPerdasDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsIn(MOTIVOS) motivo?: (typeof MOTIVOS)[number]
  @IsOptional() @IsString() localId?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina?: number
}
