import { urlDeTeste } from './url-de-teste'

// Roda em cada worker antes dos testes. Precisa vir antes de qualquer import
// do PrismaClient: ele lê DATABASE_URL ao ser construído, não ao conectar.
process.env.DATABASE_URL = urlDeTeste()
