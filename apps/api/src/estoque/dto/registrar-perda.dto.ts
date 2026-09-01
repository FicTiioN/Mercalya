import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'

const MOTIVOS = ['vencimento', 'quebra', 'avaria', 'roubo', 'erro-operacional', 'outros'] as const

export class RegistrarPerdaDto {
  @IsString() produtoId!: string
  @IsString() localId!: string
  @IsIn(MOTIVOS) motivo!: (typeof MOTIVOS)[number]

  @Type(() => Number) @IsNumber() @Min(0) quantidade!: number

  @IsOptional() @IsString() loteId?: string | null
  @IsOptional() @IsString() observacao?: string
  @IsOptional() @IsString() data?: string
}
