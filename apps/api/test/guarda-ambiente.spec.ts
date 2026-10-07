import { garantirBancoDeDesenvolvimento, motivoParaRecusar } from '../prisma/guarda-ambiente'

const LOCAL = 'postgresql://mercalya:segredo@localhost:5433/mercalya?schema=public'
const REMOTO = 'postgresql://mercalya:segredo@db.exemplo.com.br:5432/mercalya'

describe('Trava do seed e do nova-conta', () => {
  it('libera banco local fora de produção', () => {
    expect(motivoParaRecusar({ DATABASE_URL: LOCAL })).toBeNull()
    expect(motivoParaRecusar({ DATABASE_URL: LOCAL, NODE_ENV: 'development' })).toBeNull()
    expect(motivoParaRecusar({ DATABASE_URL: LOCAL, NODE_ENV: 'test' })).toBeNull()
    expect(
      motivoParaRecusar({ DATABASE_URL: 'postgresql://u:s@127.0.0.1:5432/db' }),
    ).toBeNull()
    expect(motivoParaRecusar({ DATABASE_URL: 'postgresql://u:s@[::1]:5432/db' })).toBeNull()
  })

  it('recusa NODE_ENV=production mesmo com banco local', () => {
    expect(motivoParaRecusar({ DATABASE_URL: LOCAL, NODE_ENV: 'production' })).toMatch(
      /production/,
    )
  })

  it('recusa banco fora desta máquina', () => {
    expect(motivoParaRecusar({ DATABASE_URL: REMOTO })).toMatch(/db\.exemplo\.com\.br/)
  })

  it('recusa DATABASE_URL ausente ou inválido', () => {
    expect(motivoParaRecusar({})).toMatch(/não definido/)
    expect(motivoParaRecusar({ DATABASE_URL: 'isto não é uma url' })).toMatch(/inválido/)
  })

  it('PERMITIR_SEED=sim libera; qualquer outro valor não', () => {
    expect(
      motivoParaRecusar({ DATABASE_URL: REMOTO, NODE_ENV: 'production', PERMITIR_SEED: 'sim' }),
    ).toBeNull()
    for (const valor of ['1', 'true', 'SIM', 'yes', '']) {
      expect(motivoParaRecusar({ DATABASE_URL: REMOTO, PERMITIR_SEED: valor })).not.toBeNull()
    }
  })

  it('a mensagem explica a saída e nunca expõe a senha do banco', () => {
    expect(() =>
      garantirBancoDeDesenvolvimento('db:seed', { DATABASE_URL: REMOTO }),
    ).toThrow(/db:seed recusado[\s\S]*PERMITIR_SEED=sim/)

    try {
      garantirBancoDeDesenvolvimento('db:seed', { DATABASE_URL: REMOTO })
    } catch (erro) {
      expect((erro as Error).message).not.toContain('segredo')
    }
  })
})
