import { Module } from '@nestjs/common';
import { DenunciasService } from './denuncias.service';
import { DenunciasController } from './denuncias.controller';

@Module({
  controllers: [DenunciasController],
  providers: [DenunciasService],
})
export class DenunciasModule {}
