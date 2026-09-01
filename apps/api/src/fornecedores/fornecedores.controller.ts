import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { FornecedoresService } from './fornecedores.service'
import { ConsultaFornecedoresDto } from './dto/consulta-fornecedores.dto'
import { EntradaFornecedorDto } from './dto/entrada-fornecedor.dto'

@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedores: FornecedoresService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaFornecedoresDto) {
    return this.fornecedores.listar(empresaId, consulta)
  }

  @Get('resumo')
  resumo(@EmpresaAtual() empresaId: string) {
    return this.fornecedores.resumo(empresaId)
  }

  // Antes de :id, senao "simples" seria lido como identificador.
  @Get('simples')
  simples(@EmpresaAtual() empresaId: string) {
    return this.fornecedores.listarSimples(empresaId)
  }

  @Get(':id')
  obter(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.fornecedores.obter(empresaId, id)
  }

  @Get(':id/produtos')
  produtos(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.fornecedores.produtosFornecidos(empresaId, id)
  }

  @Get(':id/compras')
  compras(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.fornecedores.ultimasCompras(empresaId, id)
  }

  @Post()
  criar(@EmpresaAtual() empresaId: string, @Body() entrada: EntradaFornecedorDto) {
    return this.fornecedores.criar(empresaId, entrada)
  }

  @Patch(':id')
  atualizar(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Body() entrada: EntradaFornecedorDto,
  ) {
    return this.fornecedores.atualizar(empresaId, id, entrada)
  }

  @Patch(':id/status')
  alternarStatus(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.fornecedores.alternarStatus(empresaId, id)
  }
}
