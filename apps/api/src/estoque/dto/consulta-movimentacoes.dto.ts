import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

const TIPOS = ['todos','ENTRADA','TRANSFERENCIA','VENDA','PERDA','AJUSTE','DEVOLUCAO'] as const

export class ConsultaMovimentacoesDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsIn(TIPOS) tipo?: (typeof TIPOS)[number]
  @IsOptional() @IsString() produtoId?: string
  @IsOptional() @IsString() usuario?: string
  @IsOptional() @IsString() origemId?: string
  @IsOptional() @IsString() destinoId?: string
  @IsOptional() @IsString() de?: string
  @IsOptional() @IsString() ate?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina?: number
}
