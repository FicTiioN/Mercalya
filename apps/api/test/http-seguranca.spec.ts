import { Test } from '@nestjs/testing'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { configurarApp } from '../src/configurar-app'
import { LIMITES, MENSAGEM_LIMITE_LOGIN } from '../src/seguranca/limite-requisicoes'

/**
 * Testes pela porta HTTP, com a aplicação montada exatamente como o `main.ts`
 * monta: guards, helmet, parser de corpo e proxy confiável só existem aí.
 */
describe('Segurança HTTP: limite de login, cabeçalhos e corpo', () => {
  let app: NestExpressApplication
  const proxyOriginal = process.env.TRUST_PROXY

  beforeAll(async () => {
    // Um proxy na frente, como na hospedagem: o IP do cliente vem do
    // X-Forwarded-For, e cada teste usa o seu para não dividir contador.
    process.env.TRUST_PROXY = '1'

    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = modulo.createNestApplication<NestExpressApplication>({ logger: false })
    configurarApp(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    if (proxyOriginal === undefined) delete process.env.TRUST_PROXY
    else process.env.TRUST_PROXY = proxyOriginal
  })

  const login = (ip: string, email: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email, senha: 'senha-errada' })

  it('a mesma conta, do mesmo IP, é bloqueada na 6ª tentativa', async () => {
    const ip = '203.0.113.10'
    const email = 'alvo-1@teste.mercalya.com.br'

    for (let i = 0; i < LIMITES.loginPorConta.limite; i++) {
      await login(ip, email).expect(401)
    }

    const bloqueada = await login(ip, email).expect(429)
    expect(bloqueada.body.message).toBe(MENSAGEM_LIMITE_LOGIN)

    // O bloqueio é da combinação IP + conta: o dono, de outro lugar, entra
    // (aqui, chega até a checagem de senha em vez de ser barrado).
    await login('203.0.113.11', email).expect(401)
    // E o mesmo IP ainda pode tentar outra conta.
    await login(ip, 'outra-conta@teste.mercalya.com.br').expect(401)
  })

  it('maiúsculas e espaços no e-mail não driblam o contador', async () => {
    const ip = '203.0.113.20'
    const variacoes = [
      'alvo-2@teste.mercalya.com.br',
      'ALVO-2@teste.mercalya.com.br',
      ' Alvo-2@Teste.Mercalya.com.br',
      'alvo-2@TESTE.mercalya.com.br',
      'Alvo-2@teste.mercalya.com.br ',
    ]
    for (const email of variacoes) await login(ip, email).expect((r) => expect(r.status).not.toBe(429))

    await login(ip, 'alvo-2@teste.mercalya.com.br').expect(429)
  })

  it('um IP testando muitas contas é barrado pelo limite por IP', async () => {
    const ip = '203.0.113.30'
    for (let i = 0; i < LIMITES.loginPorIp.limite; i++) {
      await login(ip, `conta-${i}@teste.mercalya.com.br`).expect(401)
    }
    await login(ip, 'mais-uma@teste.mercalya.com.br').expect(429)
  })

  it('o health check não entra no limite', async () => {
    const servidor = app.getHttpServer()
    for (let i = 0; i < LIMITES.geral.limite + 5; i++) {
      await request(servidor).get('/api/health').set('X-Forwarded-For', '203.0.113.40')
    }
    await request(servidor).get('/api/health').set('X-Forwarded-For', '203.0.113.40').expect(200)
  })

  it('responde com os cabeçalhos de segurança e sem X-Powered-By', async () => {
    const r = await request(app.getHttpServer()).get('/api/health').expect(200)

    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['strict-transport-security']).toMatch(/max-age=/)
    expect(r.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(r.headers['content-security-policy']).toMatch(/frame-ancestors 'self'/)
    expect(r.headers['x-powered-by']).toBeUndefined()
  })

  it('corpo JSON vai até 1 MB; acima disso é recusado antes de chegar à rota', async () => {
    const enviar = (tamanho: number) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.50')
        .send({ email: 'x@teste.mercalya.com.br', senha: 'a'.repeat(tamanho) })

    // 500 KB passaria do padrão implícito do Express (100 KB): chegar à
    // checagem de senha prova que o limite configurado é o que vale.
    await enviar(500 * 1024).expect(401)
    await enviar(1024 * 1024 + 1).expect(413)
  })
})
