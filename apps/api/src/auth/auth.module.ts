import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET')
        // Sem segredo não há assinatura confiável: falhar no boot é melhor que
        // subir aceitando tokens que qualquer um consegue forjar.
        if (!secret) throw new Error('JWT_SECRET não definido. Veja apps/api/.env.example')

        // O valor vem do ambiente, então o formato ("12h") só dá para conferir
        // em runtime — o tipo do pacote é um template literal.
        const expiresIn = (config.get<string>('JWT_EXPIRA_EM') ??
          '12h') as JwtSignOptions['expiresIn']

        return { secret, signOptions: { expiresIn } }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
