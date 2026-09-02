/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '\\.spec\\.ts$',
  // Aponta o Prisma para o banco de teste antes de qualquer import.
  setupFiles: ['<rootDir>/test/ambiente.ts'],
  // Cria o banco de teste (se preciso) e aplica as migrações, uma vez por execução.
  globalSetup: '<rootDir>/test/preparar-banco.ts',
  moduleNameMapper: {
    '^@mercalya/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Integração contra Postgres real: uma transação esperando lock leva segundos, não ms.
  testTimeout: 30_000,
}
