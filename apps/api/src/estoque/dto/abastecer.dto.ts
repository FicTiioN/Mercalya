import { Type } from 'class-transformer'
import {
  ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator'

export class ItemAbastecerDto {
  @IsString() produtoId!: string
  @Type(() => Number) @IsNumber() @Min(0) quantidade!: number
}

export class AbastecerDto {
  @IsOptional() @IsString() lojaId?: string

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ItemAbastecerDto)
  itens!: ItemAbastecerDto[]
}
