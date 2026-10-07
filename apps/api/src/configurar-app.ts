import { ValidationPipe } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { PrismaExcecaoFilter } from './comum/prisma-excecao.filter'

/**
 * Tudo o que a aplicação precisa além dos módulos: prefixo, CORS, cabeçalhos,
 * corpo, validação e filtros.
 *
 * Mora fora do `main.ts` para os testes HTTP montarem **a mesma** aplicação
 * que vai para produção. Um teste que esquece o `helmet` testaria uma API
 * diferente da real.
 */

/**
 * Teto do corpo JSON. O padrão implícito do Express é 100 KB; 1 MB cabe uma
 * compra grande e a importação de catálogo que vem depois, e ainda barra
 * quem tenta derrubar a API mandando corpos enormes.
 */
export const LIMITE_CORPO_JSON = '1mb'

export function configurarApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api')

  // Quantos proxies existem entre o cliente e a API (o balanceador da
  // hospedagem conta como um). Sem isso, `req.ip` é o IP do proxy e o limite
  // de login vira um contador global: um atacante trancaria todo mundo de fora.
  // Fora de produção fica 0, para ninguém falsificar o IP com X-Forwarded-For.
  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 0))

  // Cabeçalhos de segurança: nosniff, HSTS, frame-ancestors, sem X-Powered-By.
  app.use(helmet())

  app.useBodyParser('json', { limit: LIMITE_CORPO_JSON })

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
}
