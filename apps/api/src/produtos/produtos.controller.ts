import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { ProdutosService } from './produtos.service'
import { ConsultaProdutosDto } from './dto/consulta-produtos.dto'
import { EntradaProdutoDto } from './dto/entrada-produto.dto'
import { SalvarConfiguracaoDto } from './dto/salvar-configuracao.dto'

/**
 * Toda rota recebe `empresaId` do token, nunca do cliente. O decorator entrega
 * o valor e o service o exige como parametro: nao ha caminho para uma consulta
 * sem o filtro de tenant.
 */
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtos: ProdutosService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: string, @Query() consulta: ConsultaProdutosDto) {
    return this.produtos.listar(empresaId, consulta)
  }

  @Get('resumo')
  resumo(@EmpresaAtual() empresaId: string, @Query('lojaId') lojaId?: string) {
    return this.produtos.resumo(empresaId, lojaId)
  }

  // Antes de :id, senao "simples" seria lido como identificador.
  @Get('simples')
  simples(@EmpresaAtual() empresaId: string) {
    return this.produtos.listarSimples(empresaId)
  }

  // Sem produto: devolve o padrao de cada loja, para o formulario de cadastro.
  @Get('configuracoes-loja')
  configuracoesPadrao(@EmpresaAtual() empresaId: string) {
    return this.produtos.configuracoesPorLoja(empresaId)
  }

  @Get(':id')
  obter(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Query('lojaId') lojaId?: string,
  ) {
    return this.produtos.obter(empresaId, id, lojaId)
  }

  @Get(':id/configuracoes-loja')
  configuracoes(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.produtos.configuracoesPorLoja(empresaId, id)
  }

  @Post()
  criar(@EmpresaAtual() empresaId: string, @Body() entrada: EntradaProdutoDto) {
    return this.produtos.criar(empresaId, entrada)
  }

  @Patch(':id')
  atualizar(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Body() entrada: EntradaProdutoDto,
  ) {
    return this.produtos.atualizar(empresaId, id, entrada)
  }

  @Patch(':id/status')
  alternarStatus(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.produtos.alternarStatus(empresaId, id)
  }

  @Put(':id/configuracoes-loja/:lojaId')
  async salvarConfiguracao(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Param('lojaId') lojaId: string,
    @Body() entrada: SalvarConfiguracaoDto,
  ) {
    await this.produtos.salvarConfiguracaoLoja(empresaId, id, lojaId, entrada)
    return { ok: true }
  }
}
