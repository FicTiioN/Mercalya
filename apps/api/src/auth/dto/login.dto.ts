import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string

  @IsString()
  @MinLength(1, { message: 'Informe sua senha.' })
  senha!: string
}
