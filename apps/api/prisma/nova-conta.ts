import { PrismaClient, TipoLocal } from '@prisma/client'
import { hashSync } from 'bcryptjs'

/**
 * Cria uma conta nova, **sem nenhum dado**.
 *
 * É o que um cliente real recebe ao contratar: a empresa, o usuário
 * administrador e a estrutura mínima de estoque. Nenhum produto, fornecedor,
 * compra ou venda — a base começa vazia de propósito, para que as telas sejam
 * exercitadas no estado em que o cliente as encontra no primeiro dia.
 *
 * O estoque central e a loja **não** são opcionais: sem eles a API não sabe
 * para onde uma compra entra nem de onde uma venda sai, e várias telas falham
 * antes de chegar ao empty state.
 *
 *   npm run db:nova-conta -- --nome "Mercado X" --email dono@x.com --senha 123456
 */
const prisma = new PrismaClient()

function argumento(chave: string, padrao: string): string {
  const i = process.argv.indexOf(`--${chave}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao
}

async function main() {
  const nomeEmpresa = argumento('nome', 'Mercado Novo')
  const email = argumento('email', 'novo@mercalya.com.br').toLowerCase()
  const senha = argumento('senha', 'mercalya')
  const nomeUsuario = argumento('usuario', 'Proprietário')
  const nomeLoja = argumento('loja', 'Loja principal')

  const jaExiste = await prisma.usuario.findUnique({ where: { email } })
  if (jaExiste) {
    throw new Error(`Já existe um usuário com o e-mail ${email}.`)
  }

  const empresa = await prisma.empresa.create({ data: { nome: nomeEmpresa } })

  await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nome: nomeUsuario,
      email,
      senhaHash: hashSync(senha, 10),
    },
  })

  const loja = await prisma.loja.create({
    data: { empresaId: empresa.id, nome: nomeLoja },
  })

  await prisma.localEstoque.createMany({
    data: [
      {
        empresaId: empresa.id,
        nome: 'Estoque central',
        tipo: TipoLocal.CENTRAL,
        descricao: 'Depósito que abastece as lojas da empresa.',
      },
      {
        empresaId: empresa.id,
        nome: nomeLoja,
        tipo: TipoLocal.LOJA,
        descricao: 'Prateleiras disponíveis para venda.',
        lojaId: loja.id,
      },
    ],
  })

  console.log('Conta criada — base vazia.')
  console.log(`  empresa .......... ${empresa.nome} (${empresa.id})`)
  console.log(`  loja ............. ${loja.nome}`)
  console.log(`  login ............ ${email} / ${senha}`)
  console.log('')
  console.log('  Sem produtos, fornecedores, compras ou vendas.')
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
