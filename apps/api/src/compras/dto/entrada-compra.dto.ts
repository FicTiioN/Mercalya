import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'fd'] as const
const FORMAS = ['boleto', 'pix', 'dinheiro', 'cartao', 'prazo'] as const

export class ItemCompraDto {
  @IsString()
  produtoId!: string

  @Type(() => Number) @IsNumber() @Min(0)
  quantidade!: number

  @IsOptional() @IsIn(UNIDADES)
  unidade?: (typeof UNIDADES)[number]

  @Type(() => Number) @IsNumber() @Min(0)
  custoUnitario!: number

  @IsOptional() @IsString()
  validade?: string | null

  @IsOptional() @IsString()
  lote?: string
}

export class EntradaCompraDto {
  @IsString()
  fornecedorId!: string

  // Nota fiscal, forma e condicao de pagamento sao opcionais de proposito.
  @IsOptional() @IsString()
  notaFiscal?: string

  @IsOptional() @IsString()
  dataEmissao?: string

  @IsOptional() @IsString()
  dataEntrada?: string

  @IsOptional() @IsString()
  condicaoPagamento?: string

  @IsOptional() @IsIn(FORMAS)
  formaPagamento?: (typeof FORMAS)[number]

  @IsOptional() @IsString()
  dataVencimento?: string

  @IsOptional() @IsString()
  observacoes?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemCompraDto)
  itens!: ItemCompraDto[]

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  frete?: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  desconto?: number

  @IsString()
  localDestinoId!: string
}
