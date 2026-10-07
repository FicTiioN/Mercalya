import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { configurarApp } from './configurar-app'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  configurarApp(app)

  const porta = Number(process.env.PORT ?? 3000)
  await app.listen(porta)

  new Logger('Bootstrap').log(`API em http://localhost:${porta}/api`)
}

void bootstrap()
