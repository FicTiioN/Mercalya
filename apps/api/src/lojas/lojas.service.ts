import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TipoLocal } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { AtualizarLojaDto, CriarLojaDto } from './dto/entrada-loja.dto'

/**
 * Lojas da empresa.
 *
 * Uma loja não existe sem a prateleira dela: o `LocalEstoque` de tipo LOJA é
 * criado no mesmo commit, porque sem ele a API não sabe de onde uma venda sai
 * nem para onde um abastecimento vai. Criar os dois separados seria abrir a
 * janela para uma loja "sem lugar" — que várias telas não sabem tratar.
 *
 * Loja não é apagada: tem vendas, movimentações e configurações de produto
 * apontando para ela. Desativar tira do seletor e das operações; o histórico
 * continua legível.
 */
@Injectable()
export class LojasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string) {
    const lojas = await this.prisma.loja.findMany({
      where: { empresaId },
      orderBy: [{ ativa: 'desc' }, { nome: 'asc' }],
    })
    return lojas.map(paraContrato)
  }

  async criar(empresaId: string, entrada: CriarLojaDto) {
    const nome = entrada.nome.trim()
    if (!nome) throw new ConflictException('Informe o nome da loja.')
    await this.garantirNomeLivre(empresaId, nome)

    const loja = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.loja.create({
        data: { empresaId, nome, condominio: entrada.condominio?.trim() ?? '' },
      })
      await tx.localEstoque.create({
        data: {
          empresaId,
          nome,
          tipo: TipoLocal.LOJA,
          descricao: 'Prateleiras disponíveis para venda.',
          lojaId: criada.id,
        },
      })
      return criada
    })

    return paraContrato(loja)
  }

  async atualizar(empresaId: string, id: string, entrada: AtualizarLojaDto) {
    const loja = await this.prisma.loja.findFirst({ where: { id, empresaId } })
    if (!loja) throw new NotFoundException('Loja não encontrada.')

    const nome = entrada.nome?.trim()
    if (nome !== undefined && !nome) throw new ConflictException('Informe o nome da loja.')
    if (nome && nome.toLowerCase() !== loja.nome.toLowerCase()) {
      await this.garantirNomeLivre(empresaId, nome)
    }

    // A empresa precisa de ao menos uma loja ativa: é para ela que vai a venda
    // sem loja informada e a partir dela que o seletor abre.
    if (entrada.ativa === false && loja.ativa) {
      const outrasAtivas = await this.prisma.loja.count({
        where: { empresaId, ativa: true, id: { not: id } },
      })
      if (outrasAtivas === 0) {
        throw new ConflictException('Mantenha ao menos uma loja ativa.')
      }
    }

    const atualizada = await this.prisma.$transaction(async (tx) => {
      const salva = await tx.loja.update({
        where: { id },
        data: {
          ...(nome ? { nome } : {}),
          ...(entrada.condominio !== undefined ? { condominio: entrada.condominio.trim() } : {}),
          ...(entrada.ativa !== undefined ? { ativa: entrada.ativa } : {}),
        },
      })
      // A prateleira leva o nome da loja: renomear uma renomeia a outra.
      if (nome) {
        await tx.localEstoque.updateMany({ where: { lojaId: id }, data: { nome } })
      }
      return salva
    })

    return paraContrato(atualizada)
  }

  /** "Loja Centro" e "loja centro" são a mesma loja para quem lê a lista. */
  private async garantirNomeLivre(empresaId: string, nome: string) {
    const existente = await this.prisma.loja.findFirst({
      where: { empresaId, nome: { equals: nome, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existente) throw new ConflictException(`Já existe uma loja chamada "${nome}".`)
  }
}

function paraContrato(loja: {
  id: string
  nome: string
  condominio: string
  ativa: boolean
  criadoEm: Date
}) {
  return {
    id: loja.id,
    nome: loja.nome,
    condominio: loja.condominio,
    ativa: loja.ativa,
    criadoEm: loja.criadoEm.toISOString(),
  }
}
