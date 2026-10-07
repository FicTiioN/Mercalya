import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CancelarVendaDto {
  @IsOptional() @IsString() @MaxLength(200)
  motivo?: string
}
