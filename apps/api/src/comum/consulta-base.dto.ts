import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ConsultaBaseDto {
  @IsOptional() @IsString()
  busca?: string

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pagina?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  porPagina?: number
}
