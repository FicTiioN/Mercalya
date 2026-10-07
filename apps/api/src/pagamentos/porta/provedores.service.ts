import { ConflictException, Injectable } from '@nestjs/common'
import { PROVEDOR_MANUAL, type ProvedorPagamento } from './provedor-pagamento'
import { ProvedorSimulado } from '../simulado/provedor-simulado'

/**
 * Registro dos provedores disponíveis, por nome.
 *
 * Hoje só o simulado. Quando existir o real, é aqui que entra a credencial
 * **por empresa**: `obter(empresaId, nome)` vai buscar o token daquele lojista
 * e instanciar o adaptador com ele. A assinatura já recebe o `empresaId` para
 * essa mudança não alcançar quem chama.
 */
@Injectable()
export class ProvedoresPagamento {
  private readonly registrados = new Map<string, ProvedorPagamento>()

  constructor(simulado: ProvedorSimulado) {
    this.registrar(simulado)
  }

  registrar(provedor: ProvedorPagamento): void {
    this.registrados.set(provedor.nome, provedor)
  }

  obter(_empresaId: string, nome: string): ProvedorPagamento {
    if (nome === PROVEDOR_MANUAL) {
      throw new ConflictException('Pagamento manual não passa por provedor.')
    }
    const provedor = this.registrados.get(nome)
    if (!provedor) {
      throw new ConflictException(`Provedor de pagamento "${nome}" não está disponível.`)
    }
    return provedor
  }

  nomes(): string[] {
    return [...this.registrados.keys()]
  }
}
