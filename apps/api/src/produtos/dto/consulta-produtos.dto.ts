import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ConsultaProdutosDto {
  @IsOptional() @IsString()
  busca?: string

  @IsOptional() @IsString()
  categoriaId?: string

  @IsOptional() @IsIn(['ativo', 'inativo', 'todos'])
  status?: 'ativo' | 'inativo' | 'todos'

  @IsOptional() @IsIn(['todos', 'baixo', 'zerado', 'ok'])
  estoque?: 'todos' | 'baixo' | 'zerado' | 'ok'

  @IsOptional() @IsIn(['nome', 'estoque', 'preco', 'recentes'])
  ordenar?: 'nome' | 'estoque' | 'preco' | 'recentes'

  /** Loja usada como contexto do preco exibido. */
  @IsOptional() @IsString()
  lojaId?: string

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pagina?: number

  // Teto para uma pagina nao virar um dump da base inteira.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  porPagina?: number
}
