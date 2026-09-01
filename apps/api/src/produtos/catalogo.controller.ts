import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import { EmpresaAtual } from '../auth/decorators'
import { CatalogoService } from './catalogo.service'
import { EntradaCategoriaDto, EntradaMarcaDto } from './dto/entrada-catalogo.dto'

/**
 * Categorias e marcas. O sidebar e' canonico e nao ganha item novo: a criacao
 * acontece de dentro do formulario de produto, e a gestao em Configuracoes.
 */
@Controller()
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  /* ----------------------------- categorias ---------------------------- */

  @Get('categorias')
  categorias(@EmpresaAtual() empresaId: string) {
    return this.catalogo.listarCategorias(empresaId)
  }

  @Get('categorias/uso')
  categoriasComUso(@EmpresaAtual() empresaId: string) {
    return this.catalogo.categoriasComUso(empresaId)
  }

  @Post('categorias')
  criarCategoria(@EmpresaAtual() empresaId: string, @Body() entrada: EntradaCategoriaDto) {
    return this.catalogo.criarCategoria(empresaId, entrada)
  }

  @Patch('categorias/:id')
  atualizarCategoria(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Body() entrada: EntradaCategoriaDto,
  ) {
    return this.catalogo.atualizarCategoria(empresaId, id, entrada)
  }

  @Delete('categorias/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerCategoria(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.catalogo.removerCategoria(empresaId, id)
  }

  /* ------------------------------- marcas ------------------------------ */

  @Get('marcas')
  marcas(@EmpresaAtual() empresaId: string) {
    return this.catalogo.listarMarcas(empresaId)
  }

  @Get('marcas/uso')
  marcasComUso(@EmpresaAtual() empresaId: string) {
    return this.catalogo.marcasComUso(empresaId)
  }

  @Post('marcas')
  criarMarca(@EmpresaAtual() empresaId: string, @Body() entrada: EntradaMarcaDto) {
    return this.catalogo.criarMarca(empresaId, entrada)
  }

  @Patch('marcas/:id')
  atualizarMarca(
    @EmpresaAtual() empresaId: string,
    @Param('id') id: string,
    @Body() entrada: EntradaMarcaDto,
  ) {
    return this.catalogo.atualizarMarca(empresaId, id, entrada)
  }

  @Delete('marcas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerMarca(@EmpresaAtual() empresaId: string, @Param('id') id: string) {
    return this.catalogo.removerMarca(empresaId, id)
  }
}
