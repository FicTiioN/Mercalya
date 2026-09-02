import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

const FORMAS = ['pix', 'dinheiro', 'cartao-debito', 'cartao-credito'] as const

/**
 * O item traz só produto e quantidade. O preço **não** vem do cliente: é lido
 * da configuração da loja no instante da venda. Um totem que pudesse informar
 * o próprio preço seria um totem que vende a R$ 0,01.
 */
export class ItemVendaDto {
  @IsString()
  produtoId!: string

  @Type(() => Number) @IsNumber() @Min(0.001)
  quantidade!: number
}

export class PagamentoVendaDto {
  @IsIn(FORMAS)
  forma!: (typeof FORMAS)[number]

  @Type(() => Number) @IsNumber() @Min(0.01)
  valor!: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24)
  parcelas?: number
}

export class RegistrarVendaDto {
  /** Sem loja informada, usa a primeira ativa da empresa. */
  @IsOptional() @IsString()
  lojaId?: string

  @IsOptional() @IsString()
  clienteId?: string

  @IsOptional() @IsString() @MaxLength(120)
  clienteNome?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens!: ItemVendaDto[]

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagamentoVendaDto)
  pagamentos!: PagamentoVendaDto[]

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  desconto?: number

  @IsOptional() @IsString() @MaxLength(500)
  observacao?: string

  /**
   * Gerada pelo PDV antes de enviar. Reenviar com a mesma chave devolve a
   * venda já registrada em vez de criar outra — é o que protege contra a
   * queda de rede entre o commit e a resposta.
   */
  @IsOptional() @IsString() @MaxLength(64)
  chaveIdempotencia?: string
}
