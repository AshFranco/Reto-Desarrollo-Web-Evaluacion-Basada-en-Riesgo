import { Module } from '@nestjs/common';
import { CategoriasAlimentoService } from './categorias-alimento.service';
import { CategoriasAlimentoController } from './categorias-alimento.controller';

@Module({
  controllers: [CategoriasAlimentoController],
  providers: [CategoriasAlimentoService],
})
export class CategoriasAlimentoModule {}
