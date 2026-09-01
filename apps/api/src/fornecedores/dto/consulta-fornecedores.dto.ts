import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ConsultaFornecedoresDto {
  @IsOptional() @IsString()
  busca?: string

  @IsOptional() @IsIn(['ativo', 'inativo', 'todos'])
  status?: 'ativo' | 'inativo' | 'todos'

  @IsOptional() @IsString()
  categoriaId?: string

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pagina?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  porPagina?: number
}
