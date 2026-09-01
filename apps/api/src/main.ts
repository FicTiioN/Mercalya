import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { PrismaExcecaoFilter } from './comum/prisma-excecao.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      // Campo que não está no DTO não entra: evita que um cliente grave
      // coluna que ninguém declarou.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Erro do Prisma vira resposta com significado, em vez de 500 genérico.
  app.useGlobalFilters(new PrismaExcecaoFilter())

  // Encerra o Prisma no SIGTERM em vez de derrubar conexões no meio.
  app.enableShutdownHooks()

  const porta = Number(process.env.PORT ?? 3000)
  await app.listen(porta)

  new Logger('Bootstrap').log(`API em http://localhost:${porta}/api`)
}

void bootstrap()
