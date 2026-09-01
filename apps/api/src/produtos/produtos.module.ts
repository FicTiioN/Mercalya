import { Module } from '@nestjs/common'
import { ProdutosController } from './produtos.controller'
import { CatalogoController } from './catalogo.controller'
import { ProdutosService } from './produtos.service'
import { CatalogoService } from './catalogo.service'

@Module({
  controllers: [ProdutosController, CatalogoController],
  providers: [ProdutosService, CatalogoService],
  exports: [ProdutosService, CatalogoService],
})
export class ProdutosModule {}
