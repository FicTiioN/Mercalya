import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class RetirarDaLojaDto {
  @IsString() produtoId!: string
  @Type(() => Number) @IsNumber() @Min(0) quantidade!: number
  @IsOptional() @IsString() lojaId?: string
}
