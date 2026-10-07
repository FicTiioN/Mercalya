import { Logger } from '@nestjs/common'
import { validarAmbiente, verificarAmbiente } from '../src/config/ambiente'

const SEGREDO_FORTE = 'a'.repeat(64)
const BANCO = 'postgresql://mercalya:senha-do-banco@localhost:5433/mercalya'

const valido = {
  DATABASE_URL: BANCO,
  JWT_SECRET: SEGREDO_FORTE,
  CORS_ORIGIN: 'https://app.mercalya.com.br',
}

describe('Validação das variáveis de ambiente', () => {
  beforeAll(() => {
    // Os avisos são o comportamento esperado aqui; no log do teste são ruído.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterAll(() => jest.restoreAllMocks())

  it('configuração completa passa em qualquer ambiente', () => {
    for (const NODE_ENV of ['development', 'test', 'production']) {
      expect(verificarAmbiente({ ...valido, NODE_ENV })).toMatchObject({ erros: [], avisos: [] })
    }
  })

  it('NODE_ENV ausente vira development; valor desconhecido é erro', () => {
    expect(validarAmbiente(valido)).toMatchObject({ NODE_ENV: 'development' })
    expect(verificarAmbiente({ ...valido, NODE_ENV: 'prod' }).erros).toEqual([
      expect.stringMatching(/NODE_ENV="prod"/),
    ])
  })

  it('DATABASE_URL e JWT_SECRET são obrigatórios em qualquer ambiente', () => {
    const { erros } = verificarAmbiente({ CORS_ORIGIN: valido.CORS_ORIGIN })
    expect(erros).toEqual([
      expect.stringMatching(/DATABASE_URL não definido/),
      expect.stringMatching(/JWT_SECRET não definido/),
    ])
    expect(verificarAmbiente({ ...valido, DATABASE_URL: 'mysql://x' }).erros).toEqual([
      expect.stringMatching(/postgresql:\/\//),
    ])
  })

  describe('JWT_SECRET fraco', () => {
    it('em produção derruba o boot', () => {
      for (const JWT_SECRET of ['troque-me', 'curto-demais']) {
        const { erros } = verificarAmbiente({ ...valido, NODE_ENV: 'production', JWT_SECRET })
        expect(erros).toEqual([expect.stringMatching(/JWT_SECRET/)])
      }
    })

    it('em desenvolvimento só avisa', () => {
      const r = verificarAmbiente({ ...valido, JWT_SECRET: 'troque-me' })
      expect(r.erros).toEqual([])
      expect(r.avisos).toEqual([expect.stringMatching(/valor de exemplo/)])
    })
  })

  it('CORS_ORIGIN é obrigatório só em produção', () => {
    const semCors = { DATABASE_URL: BANCO, JWT_SECRET: SEGREDO_FORTE }
    expect(verificarAmbiente(semCors).erros).toEqual([])
    expect(verificarAmbiente({ ...semCors, NODE_ENV: 'production' }).erros).toEqual([
      expect.stringMatching(/CORS_ORIGIN/),
    ])
  })

  it('PORT precisa ser uma porta válida', () => {
    for (const PORT of ['abc', '0', '70000', '30.5']) {
      expect(verificarAmbiente({ ...valido, PORT }).erros).toHaveLength(1)
    }
    expect(verificarAmbiente({ ...valido, PORT: '3000' }).erros).toEqual([])
  })

  it('lança com todos os problemas de uma vez, sem expor segredos', () => {
    const env = {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://root:senha-do-banco@x',
      JWT_SECRET: 'troque-me',
      PORT: 'abc',
    }
    let mensagem = ''
    try {
      validarAmbiente(env)
    } catch (erro) {
      mensagem = (erro as Error).message
    }

    expect(mensagem).toMatch(/DATABASE_URL/)
    expect(mensagem).toMatch(/JWT_SECRET/)
    expect(mensagem).toMatch(/CORS_ORIGIN/)
    expect(mensagem).toMatch(/PORT/)
    expect(mensagem).not.toContain('senha-do-banco')
    expect(mensagem).not.toContain('troque-me')
  })
})
