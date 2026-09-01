import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'
import { ConfiguracaoLojaDto } from './configuracao-loja.dto'

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'fd'] as const
const CONTROLES = ['nao-controlar', 'por-lote', 'obrigatorio'] as const

export class EntradaProdutoDto {
  @IsString()
  nome!: string

  @IsOptional() @IsString()
  ean?: string

  @IsOptional() @IsString()
  sku?: string

  @IsString()
  categoriaId!: string

  @IsOptional() @IsString()
  marcaId?: string | null

  @IsIn(UNIDADES)
  unidade!: (typeof UNIDADES)[number]

  @IsOptional() @IsString()
  conteudo?: string

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  precoSugerido?: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  pontoCompra?: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estoqueMaximoCentral?: number

  @IsOptional() @IsIn(CONTROLES)
  controleValidade?: (typeof CONTROLES)[number]

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  validadePadraoDias?: number | null

  @IsOptional() @IsString()
  localizacaoPadrao?: string

  @IsOptional() @IsString()
  fornecedorPrincipalId?: string | null

  @IsOptional() @IsString()
  observacoes?: string

  @IsOptional() @IsString()
  imagem?: string

  /** Preco e niveis por loja. Sem isto o produto nao pode ser vendido. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoLojaDto)
  configuracoesLoja!: ConfiguracaoLojaDto[]

  @IsOptional() @IsBoolean()
  ativo?: boolean
}
