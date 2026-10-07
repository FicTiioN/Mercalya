import { Controller, NotFoundException, Param, Post } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { ProvedorSimulado } from './simulado/provedor-simulado'

/**
 * Controle do terminal simulado — o botão "aproximar o cartão".
 *
 * Só muda o estado **no provedor**. O Mercalya toma conhecimento do mesmo
 * jeito que tomaria de uma maquininha real: quando o totem sincroniza
 * (`GET /vendas/:id/pagamentos/:pid`) ou quando a conciliação passa.
 *
 * O pagamento precisa ser da empresa do token: simulador não é desculpa para
 * um lojista mexer no terminal de outro.
 */
@Controller('pagamentos')
export class PagamentosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulado: ProvedorSimulado,
  ) {}

  @Post(':id/simulador/aprovar')
  aprovar(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.forcar(empresaId, id, 'aprovado')
  }

  @Post(':id/simulador/recusar')
  recusar(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.forcar(empresaId, id, 'recusado')
  }

  private async forcar(empresaId: string, id: string, desfecho: 'aprovado' | 'recusado') {
    const pagamento = await this.prisma.pagamento.findFirst({
      where: { id, empresaId, provedor: this.simulado.nome },
      select: { referenciaExterna: true },
    })
    if (!pagamento?.referenciaExterna) {
      throw new NotFoundException('Pagamento simulado não encontrado.')
    }
    const situacao = this.simulado.forcar(pagamento.referenciaExterna, desfecho)
    return { status: situacao.status, bruto: situacao.bruto }
  }
}
