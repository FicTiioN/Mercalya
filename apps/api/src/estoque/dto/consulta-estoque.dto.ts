import { Type } from 'class-transformer'
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ConsultaEstoqueDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsString() localId?: string
  @IsOptional() @IsString() categoriaId?: string

  @IsOptional() @IsIn(['todos', 'disponivel', 'atencao', 'critico'])
  status?: 'todos' | 'disponivel' | 'atencao' | 'critico'

  /** Janela em dias, ou lotes ja vencidos. */
  @IsOptional() @IsIn(['todos', '7', '15', '30', 'vencidos'])
  validade?: 'todos' | '7' | '15' | '30' | 'vencidos'

  @IsOptional() @IsBooleanString()
  apenasComReserva?: string

  @IsOptional() @IsIn(['nome', 'validade', 'valor', 'quantidade'])
  ordenar?: 'nome' | 'validade' | 'valor' | 'quantidade'

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina?: number
}
