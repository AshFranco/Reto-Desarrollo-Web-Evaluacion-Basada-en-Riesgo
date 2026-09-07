import { Module } from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service';
import { EstablecimientosController } from './establecimientos.controller';

@Module({
  controllers: [EstablecimientosController],
  providers: [EstablecimientosService],
})
export class EstablecimientosModule {}
