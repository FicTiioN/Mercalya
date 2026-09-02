import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { VendasService } from './vendas.service'

/**
 * Dispara a conciliação a cada minuto.
 *
 * O trabalho está em `VendasService.conciliar`; aqui só o relógio e a trava
 * contra execuções sobrepostas — uma rodada lenta (provedor fora do ar) não
 * pode acumular com a seguinte.
 *
 * Só roda com `ScheduleModule.forRoot()` registrado, o que acontece no
 * `AppModule` e não nos testes — lá a conciliação é chamada à mão, com o
 * relógio controlado.
 */
@Injectable()
export class ConciliacaoService {
  private readonly logger = new Logger(ConciliacaoService.name)
  private emExecucao = false

  constructor(private readonly vendas: VendasService) {}

  @Interval(60_000)
  async executar(): Promise<void> {
    if (this.emExecucao) return
    this.emExecucao = true

    try {
      const r = await this.vendas.conciliar()
      const houveAlgo = r.aprovados + r.recusados + r.expirados + r.abandonadas + r.erros > 0
      if (houveAlgo) {
        this.logger.log(
          `Conciliação: ${r.verificados} verificados · ${r.aprovados} aprovados · ` +
            `${r.recusados} recusados · ${r.expirados} expirados · ` +
            `${r.abandonadas} abandonadas · ${r.erros} erros`,
        )
      }
    } catch (erro) {
      this.logger.error(`Conciliação falhou: ${erro instanceof Error ? erro.message : erro}`)
    } finally {
      this.emExecucao = false
    }
  }
}
