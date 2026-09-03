import { Module } from '@nestjs/common';
import { CasosService } from './casos.service';
import { CasosController } from './casos.controller';

@Module({
  controllers: [CasosController],
  providers: [CasosService],
})
export class CasosModule {}
