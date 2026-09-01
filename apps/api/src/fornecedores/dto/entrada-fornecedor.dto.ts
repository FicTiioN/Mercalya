import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

class ContatoDto {
  @IsOptional() @IsString() nome?: string
  @IsOptional() @IsString() cargo?: string
  @IsOptional() @IsString() telefone?: string
  @IsOptional() @IsString() whatsapp?: string
  @IsOptional() @IsString() email?: string
}

class EnderecoDto {
  @IsOptional() @IsString() cep?: string
  @IsOptional() @IsString() logradouro?: string
  @IsOptional() @IsString() numero?: string
  @IsOptional() @IsString() complemento?: string
  @IsOptional() @IsString() bairro?: string
  @IsOptional() @IsString() cidade?: string
  @IsOptional() @IsString() uf?: string
}

class ComercialDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prazoEntregaDias?: number
  @IsOptional() @IsString() condicaoPagamento?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) descontoPadrao?: number
}

export class EntradaFornecedorDto {
  @IsString()
  nome!: string

  @IsOptional() @IsString()
  nomeFantasia?: string

  @IsOptional() @IsString()
  documento?: string

  @IsOptional() @IsString()
  categoriaPrincipalId?: string

  @IsOptional() @ValidateNested() @Type(() => ContatoDto)
  contato?: ContatoDto

  @IsOptional() @ValidateNested() @Type(() => EnderecoDto)
  endereco?: EnderecoDto

  @IsOptional() @ValidateNested() @Type(() => ComercialDto)
  comercial?: ComercialDto

  @IsOptional() @IsString()
  observacoes?: string

  @IsOptional() @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo'
}
