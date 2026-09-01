import { IsOptional, IsString, MaxLength } from 'class-validator'

export class EntradaCategoriaDto {
  @IsString() @MaxLength(60)
  nome!: string

  /** Hex da cor usada nos gráficos e badges. */
  @IsOptional() @IsString() @MaxLength(9)
  cor?: string

  @IsOptional() @IsString() @MaxLength(8)
  emoji?: string
}

export class EntradaMarcaDto {
  @IsString() @MaxLength(60)
  nome!: string
}
