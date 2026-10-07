import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { LojasService } from './lojas.service'
import { AtualizarLojaDto, CriarLojaDto } from './dto/entrada-loja.dto'

/** Gestão das lojas da empresa. A visão operacional de uma loja fica em `/loja`. */
@Controller('lojas')
export class LojasController {
  constructor(private readonly lojas: LojasService) {}

  /** Todas, inclusive inativas — a tela de gestão precisa vê-las para reativar. */
  @Get()
  listar(@EmpresaAtual() empresaId: string) {
    return this.lojas.listar(empresaId)
  }

  @Post()
  criar(@EmpresaAtual() empresaId: string, @Body() entrada: CriarLojaDto) {
    return this.lojas.criar(empresaId, entrada)
  }

  @Patch(':id')
  atualizar(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Body() entrada: AtualizarLojaDto,
  ) {
    return this.lojas.atualizar(empresaId, id, entrada)
  }
}
