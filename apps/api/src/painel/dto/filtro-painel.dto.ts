import { IsIn, IsOptional, IsString } from 'class-validator'

export class FiltroPainelDto {
  @IsOptional() @IsString() lojaId?: string
  @IsOptional() @IsString() de?: string
  @IsOptional() @IsString() ate?: string

  @IsOptional() @IsIn(['diario', 'semanal', 'mensal'])
  granularidade?: 'diario' | 'semanal' | 'mensal'
}
