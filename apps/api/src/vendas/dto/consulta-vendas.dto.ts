import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

const FORMAS = ['todas', 'pix', 'dinheiro', 'cartao-debito', 'cartao-credito'] as const
// "todos" não inclui aberta: carrinho aguardando pagamento ainda não é venda.
const STATUS = ['todos', 'aberta', 'concluida', 'cancelada'] as const

export class ConsultaVendasDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsString() de?: string
  @IsOptional() @IsString() ate?: string
  @IsOptional() @IsString() lojaId?: string
  @IsOptional() @IsIn(FORMAS) formaPagamento?: (typeof FORMAS)[number]
  @IsOptional() @IsIn(STATUS) status?: (typeof STATUS)[number]
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina?: number
}
