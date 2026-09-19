import { Module } from '@nestjs/common';
import { ProgramacionInstitucionalService } from './programacion-institucional.service';
import { ProgramacionInstitucionalController } from './programacion-institucional.controller';

@Module({
  controllers: [ProgramacionInstitucionalController],
  providers: [ProgramacionInstitucionalService],
  exports: [ProgramacionInstitucionalService],
})
export class ProgramacionInstitucionalModule {}
